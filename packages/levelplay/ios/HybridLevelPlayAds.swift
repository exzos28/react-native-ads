import Foundation
import NitroModules
// Verified by compiling a throwaway Swift file (`swiftc -typecheck`) against the
// real IronSourceSDK 9.5.0.0 XCFramework (https://trunk.cocoapods.org, pod
// "IronSourceSDK") — the framework module is named `IronSource`, and the unified
// LevelPlay iOS API lives under the `LPM*` prefix (LPMInterstitialAd, LPMRewardedAd,
// LPMInitRequestBuilder, LPMPrivacySettings, ...), distinct from the legacy
// `IronSourceAds` facade.
@preconcurrency import IronSource

final class HybridLevelPlayAds: HybridLevelPlayAdsSpec, @unchecked Sendable {
  private let stateLock = NSLock()
  private var isInitialized = false
  private var isInitializing = false
  private var initializedAppKey: String?
  private var initializingAppKey: String?
  private var initializationContinuations: [CheckedContinuation<Void, Error>] = []

  // Keyed by adUnitId: load() and show() are separate calls in this module's
  // spec, so the loaded ad object has to be held onto between the two calls.
  private var loadedInterstitials: [String: InterstitialAdHolder] = [:]
  private var loadedRewarded: [String: RewardedAdHolder] = [:]

  // NSLock.lock()/unlock() are `noasync` in Swift 6 — this keeps locking out of
  // `async` function bodies (a suspension point could otherwise occur while held).
  private func withStateLock<T>(_ body: () -> T) -> T {
    stateLock.lock()
    defer { stateLock.unlock() }
    return body()
  }

  func initialize(appKey: String, testMode: Bool) throws -> Promise<Void> {
    guard !appKey.isEmpty else {
      throw levelPlayAdsError("LevelPlay app key is empty")
    }

    return Promise.async {
      try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          self.stateLock.lock()
          if self.isInitialized {
            let existing = self.initializedAppKey
            self.stateLock.unlock()
            if let existing, existing != appKey {
              continuation.resume(
                throwing: levelPlayAdsError("LevelPlay SDK was already initialized with another app key")
              )
            } else {
              continuation.resume()
            }
            return
          }

          if self.isInitializing, self.initializingAppKey != appKey {
            self.stateLock.unlock()
            continuation.resume(
              throwing: levelPlayAdsError("LevelPlay SDK is being initialized with another app key")
            )
            return
          }

          self.initializationContinuations.append(continuation)
          if self.isInitializing {
            self.stateLock.unlock()
            return
          }
          self.isInitializing = true
          self.initializingAppKey = appKey
          self.stateLock.unlock()

          if testMode {
            LevelPlay.setAdaptersDebug(true)
          }

          let request = LPMInitRequestBuilder(appKey: appKey).build()
          LevelPlay.initWithRequest(request) { _, error in
            self.handleInitialization(error: error)
          }
        }
      }
    }
  }

  fileprivate func handleInitialization(error: Error?) {
    stateLock.lock()
    let continuations = initializationContinuations
    initializationContinuations.removeAll()
    isInitializing = false
    let appKey = initializingAppKey
    initializingAppKey = nil
    if error == nil {
      isInitialized = true
      initializedAppKey = appKey
    }
    stateLock.unlock()

    continuations.forEach { continuation in
      if let error {
        continuation.resume(throwing: error)
      } else {
        continuation.resume()
      }
    }
  }

  func load(adType: LevelPlayAdType, adUnitId: String) throws -> Promise<Void> {
    guard !adUnitId.isEmpty else {
      throw levelPlayAdsError("LevelPlay ad unit ID is empty")
    }

    return Promise.async {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        switch adType {
        case .interstitial:
          DispatchQueue.main.async {
            let holder = InterstitialAdHolder(adUnitId: adUnitId)
            RetainBox.retain(holder)
            holder.onLoaded = { [weak self] in
              self?.withStateLock { self?.loadedInterstitials[adUnitId] = holder }
              RetainBox.release(holder)
              continuation.resume()
            }
            holder.onLoadFailed = { error in
              RetainBox.release(holder)
              continuation.resume(throwing: error)
            }
            holder.ad.loadAd()
          }
        case .rewarded:
          DispatchQueue.main.async {
            let holder = RewardedAdHolder(adUnitId: adUnitId)
            RetainBox.retain(holder)
            holder.onLoaded = { [weak self] in
              self?.withStateLock { self?.loadedRewarded[adUnitId] = holder }
              RetainBox.release(holder)
              continuation.resume()
            }
            holder.onLoadFailed = { error in
              RetainBox.release(holder)
              continuation.resume(throwing: error)
            }
            holder.ad.loadAd()
          }
        }
      }
    }
  }

  func show(adType: LevelPlayAdType, adUnitId: String) throws -> Promise<LevelPlayAdShowResult> {
    guard !adUnitId.isEmpty else {
      throw levelPlayAdsError("LevelPlay ad unit ID is empty")
    }

    return Promise.async {
      let viewController = try await currentViewController()

      switch adType {
      case .interstitial:
        let holder = self.withStateLock { self.loadedInterstitials.removeValue(forKey: adUnitId) }
        guard let holder else {
          throw levelPlayAdsError("LevelPlay interstitial ad is not ready")
        }
        // Reuse the same delegate that was registered in load() — swapping in a
        // different delegate instance here is what used to drop didCloseAd.
        RetainBox.retain(holder)
        return try await withCheckedThrowingContinuation {
          (continuation: CheckedContinuation<LevelPlayAdShowResult, Error>) in
          holder.onDisplayFailed = { error in onShowDisplayFailed(holder, continuation, error) }
          holder.onClosed = {
            RetainBox.release(holder)
            continuation.resume(returning: LevelPlayAdShowResult(state: .completed))
          }
          DispatchQueue.main.async {
            holder.ad.showAd(viewController: viewController, placementName: nil)
          }
        }
      case .rewarded:
        let holder = self.withStateLock { self.loadedRewarded.removeValue(forKey: adUnitId) }
        guard let holder else {
          throw levelPlayAdsError("LevelPlay rewarded ad is not ready")
        }
        RetainBox.retain(holder)
        // Rewarded ads don't carry a Unity-style "finish state" — LevelPlay fires a
        // separate didReward event before didCloseAd, so completion is derived from
        // whether that event happened at all before the ad closed.
        var didReceiveReward = false
        return try await withCheckedThrowingContinuation {
          (continuation: CheckedContinuation<LevelPlayAdShowResult, Error>) in
          holder.onReward = { didReceiveReward = true }
          holder.onDisplayFailed = { error in onShowDisplayFailed(holder, continuation, error) }
          holder.onClosed = {
            RetainBox.release(holder)
            let state: LevelPlayAdShowState = didReceiveReward ? .completed : .skipped
            continuation.resume(returning: LevelPlayAdShowResult(state: state))
          }
          DispatchQueue.main.async {
            holder.ad.showAd(viewController: viewController, placementName: nil)
          }
        }
      }
    }
  }

  func setGDPRConsent(optIn: Bool) throws {
    LPMPrivacySettings.setGDPRConsent(optIn)
  }

  func setCCPAConsent(optIn: Bool) throws {
    // CCPA flag semantics are "opted out of sale", the inverse of our `optIn`
    // (personalized-ads-allowed) flag.
    LPMPrivacySettings.setCCPA(!optIn)
  }

  func setCOPPA(isCoppa: Bool) throws {
    LPMPrivacySettings.setCOPPA(isCoppa)
  }
}

private func onShowDisplayFailed<T>(
  _ holder: AnyObject,
  _ continuation: CheckedContinuation<T, Error>,
  _ error: Error
) {
  RetainBox.release(holder)
  continuation.resume(throwing: error)
}

// LevelPlay requires the same delegate instance to stay registered from
// loadAd() through showAd() — swapping in a different delegate right before
// showAd() (as the old per-phase Load/Show delegate pairs did) is what dropped
// didCloseAd on Android's equivalent path once the listener was swapped.
private class AdHolder: NSObject, @unchecked Sendable {
  var onLoaded: (() -> Void)?
  var onLoadFailed: ((Error) -> Void)?
  var onDisplayed: (() -> Void)?
  var onDisplayFailed: ((Error) -> Void)?
  var onClosed: (() -> Void)?
}

private final class InterstitialAdHolder: AdHolder, LPMInterstitialAdDelegate {
  let ad: LPMInterstitialAd

  init(adUnitId: String) {
    self.ad = LPMInterstitialAd(adUnitId: adUnitId)
    super.init()
    self.ad.setDelegate(self)
  }

  func didLoadAd(with adInfo: LPMAdInfo) { onLoaded?() }
  func didFailToLoadAd(withAdUnitId adUnitId: String, error: Error) { onLoadFailed?(error) }
  func didDisplayAd(with adInfo: LPMAdInfo) { onDisplayed?() }
  func didFailToDisplayAd(withAdInfo adInfo: LPMAdInfo, error: Error) { onDisplayFailed?(error) }
  func didClickAd(withAdInfo adInfo: LPMAdInfo) {}
  func didCloseAd(withAdInfo adInfo: LPMAdInfo) { onClosed?() }
}

private final class RewardedAdHolder: AdHolder, LPMRewardedAdDelegate {
  let ad: LPMRewardedAd
  var onReward: (() -> Void)?

  init(adUnitId: String) {
    self.ad = LPMRewardedAd(adUnitId: adUnitId)
    super.init()
    self.ad.setDelegate(self)
  }

  func didLoadAd(with adInfo: LPMAdInfo) { onLoaded?() }
  func didFailToLoadAd(withAdUnitId adUnitId: String, error: Error) { onLoadFailed?(error) }
  func didDisplayAd(with adInfo: LPMAdInfo) { onDisplayed?() }
  func didReward(withAdInfo adInfo: LPMAdInfo, reward: LPMReward) { onReward?() }
  func didFailToDisplayAd(withAdInfo adInfo: LPMAdInfo, error: Error) { onDisplayFailed?(error) }
  func didClickAd(withAdInfo adInfo: LPMAdInfo) {}
  func didCloseAd(withAdInfo adInfo: LPMAdInfo) { onClosed?() }
}
