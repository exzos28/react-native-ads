import Foundation
import NitroModules
import VungleAdsSDK

final class HybridLiftoffInterstitialAd:
  HybridLiftoffInterstitialAdSpec, @unchecked Sendable {
  fileprivate let events = LiftoffAdEventEmitter()
  private let ad: VungleInterstitial
  private lazy var delegate = LiftoffInterstitialDelegate(owner: self)

  init(placementId: String) {
    self.ad = VungleInterstitial(placementId: placementId)
    super.init()
    self.ad.delegate = delegate
  }

  func load() throws {
    DispatchQueue.main.async { self.ad.load() }
  }

  func show(options: LiftoffAdShowOptions?) throws -> Promise<Void> {
    Promise.async {
      do {
        let viewController = try await currentViewController()
        try await withCheckedThrowingContinuation {
          (continuation: CheckedContinuation<Void, Error>) in
          DispatchQueue.main.async {
            guard self.ad.canPlayAd() else {
              continuation.resume(
                throwing: liftoffError("Liftoff interstitial ad is not ready")
              )
              return
            }
            self.ad.present(with: viewController)
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
    eventType: LiftoffAdEventType,
    listener: @escaping (LiftoffAdEventPayload?) -> Void
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

private final class LiftoffInterstitialDelegate: NSObject, VungleInterstitialDelegate {
  private weak var owner: HybridLiftoffInterstitialAd?

  init(owner: HybridLiftoffInterstitialAd) {
    self.owner = owner
  }

  func interstitialAdDidLoad(_ interstitial: VungleInterstitial) {
    owner?.events.emit(.loaded)
  }

  func interstitialAdDidFailToLoad(
    _ interstitial: VungleInterstitial,
    withError error: NSError
  ) {
    owner?.events.emit(.error, error: error)
  }

  func interstitialAdDidFailToPresent(
    _ interstitial: VungleInterstitial,
    withError error: NSError
  ) {
    owner?.events.emit(.error, error: error)
  }

  func interstitialAdDidPresent(_ interstitial: VungleInterstitial) {
    owner?.events.emit(.opened)
  }

  func interstitialAdDidClick(_ interstitial: VungleInterstitial) {
    owner?.events.emit(.clicked)
  }

  func interstitialAdDidClose(_ interstitial: VungleInterstitial) {
    owner?.events.emit(.closed)
  }
}
