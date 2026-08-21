import Foundation
import NitroModules
import PAGAdSDK

final class HybridPangleInterstitialAd:
  HybridPangleInterstitialAdSpec, @unchecked Sendable {
  fileprivate let events = PangleAdEventEmitter()
  private let placementId: String
  fileprivate var ad: PAGLInterstitialAd?
  fileprivate let showTimeout = PangleShowTimeoutController()
  private lazy var delegate = PangleInterstitialDelegate(owner: self)

  init(placementId: String) {
    self.placementId = placementId
  }

  func load() throws {
    DispatchQueue.main.async {
      let request = PAGInterstitialRequest()
      PAGLInterstitialAd.load(withSlotID: self.placementId, request: request) {
        interstitialAd, error in
        DispatchQueue.main.async {
          guard let interstitialAd else {
            self.events.emit(.error, error: error ?? pangleError("Pangle interstitial ad failed to load"))
            return
          }
          interstitialAd.delegate = self.delegate
          self.ad = interstitialAd
          self.events.emit(.loaded)
        }
      }
    }
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
                throwing: pangleError("Pangle interstitial ad is not ready")
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

private final class PangleInterstitialDelegate: NSObject, PAGLInterstitialAdDelegate {
  private weak var owner: HybridPangleInterstitialAd?

  init(owner: HybridPangleInterstitialAd) {
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

  func adDidShowFail(_ ad: any PAGAdProtocol, error: Error) {
    owner?.showTimeout.disarm()
    owner?.ad = nil
    owner?.events.emit(.error, error: error)
  }
}
