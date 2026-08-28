import Foundation
import NitroModules
import PAGAdSDK

final class HybridPangleRewardedAd:
  HybridPangleRewardedAdSpec, @unchecked Sendable {
  fileprivate let events = PangleAdEventEmitter()
  private let placementId: String
  fileprivate var ad: PAGRewardedAd?
  fileprivate let showTimeout = PangleShowTimeoutController()
  private lazy var delegate = PangleRewardedDelegate(owner: self)

  init(placementId: String) {
    self.placementId = placementId
  }

  func load(verification: PangleAdVerificationOptions?) throws {
    DispatchQueue.main.async {
      let request = Self.makeRewardedRequest(verification: verification)
      PAGRewardedAd.load(withSlotID: self.placementId, request: request) {
        rewardedAd, error in
        DispatchQueue.main.async {
          guard let rewardedAd else {
            self.events.emit(.error, error: error ?? pangleError("Pangle rewarded ad failed to load"))
            return
          }
          rewardedAd.delegate = self.delegate
          self.ad = rewardedAd
          self.events.emit(.rewardedLoaded)
        }
      }
    }
  }

  private static func makeRewardedRequest(
    verification: PangleAdVerificationOptions?
  ) -> PAGRewardedRequest {
    let request = PAGRewardedRequest()
    let extraInfo = extraInfo(from: verification)
    if !extraInfo.isEmpty {
      request.extraInfo = extraInfo
    }
    return request
  }

  // Pangle SDK only reads the `media_extra` key from
  // PAGRewardedRequest.extraInfo (confirmed with Pangle support); any other
  // key, including a literal `userId`/`customData`, is silently ignored and
  // the S2S callback's `user_id` stays "defaultUser". PAGConfig.share()
  // .userDataString has no effect on the SSV callback either. Only `userId`
  // is forwarded — Pangle has room for a single opaque value, so
  // `customData` (a distinct, unrelated field) is not supported here.
  private static func extraInfo(from verification: PangleAdVerificationOptions?) -> [String: String] {
    guard let userId = verification?.userId, !userId.isEmpty else {
      return [:]
    }
    return ["media_extra": userId]
  }

  func show() throws -> Promise<Void> {
    Promise.async {
      do {
        let viewController = try await currentViewController()
        try await withCheckedThrowingContinuation {
          (continuation: CheckedContinuation<Void, Error>) in
          DispatchQueue.main.async {
            guard let ad = self.ad else {
              continuation.resume(
                throwing: pangleError("Pangle rewarded ad is not ready")
              )
              return
            }
            self.showTimeout.arm { [weak self] in
              guard let self else { return }
              self.ad = nil
              self.events.emit(.error, payload: PangleAdEventPayload(
                errorCode: nil,
                errorMessage: "Pangle ad show() timed out without a response from the SDK"
              ))
            }
            ad.present(fromRootViewController: viewController)
            continuation.resume()
          }
        }
      } catch {
        self.events.emit(.error, error: error)
        throw error
      }
    }
  }

  func addAdEventListener(
    eventType: PangleAdEventType,
    listener: @escaping (PangleAdEventPayload?) -> Void
  ) throws -> Double {
    events.add(eventType: eventType, listener: listener)
  }

  func removeAdEventListener(subscriptionId: Double) throws {
    events.remove(subscriptionId: subscriptionId)
  }

  func removeAllListeners() throws {
    events.removeAll()
  }
}

private final class PangleRewardedDelegate: NSObject, PAGRewardedAdDelegate {
  private weak var owner: HybridPangleRewardedAd?

  init(owner: HybridPangleRewardedAd) {
    self.owner = owner
  }

  func adDidShow(_ ad: any PAGAdProtocol) {
    owner?.showTimeout.disarm()
    owner?.events.emit(.opened)
  }

  func adDidClick(_ ad: any PAGAdProtocol) {
    owner?.events.emit(.clicked)
  }

  func adDidDismiss(_ ad: any PAGAdProtocol) {
    owner?.showTimeout.disarm()
    owner?.ad = nil
    owner?.events.emit(.closed)
  }

  func rewardedAd(_ rewardedAd: PAGRewardedAd, userDidEarnReward rewardModel: PAGRewardModel) {
    owner?.showTimeout.disarm()
    owner?.events.emit(.rewardedEarnedReward)
  }

  func adDidShowFail(_ ad: any PAGAdProtocol, error: Error) {
    owner?.showTimeout.disarm()
    owner?.ad = nil
    owner?.events.emit(.error, error: error)
  }
}
