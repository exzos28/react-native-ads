import Foundation
import NitroModules
@preconcurrency import UnityAds

final class HybridUnityAds: HybridUnityAdsSpec, @unchecked Sendable {
  private let stateLock = NSLock()
  private var isInitialized = false
  private var isInitializing = false
  private var initializedGameId: String?
  private var initializingGameId: String?
  private var initializationContinuations: [CheckedContinuation<Void, Error>] = []

  // Keyed by placementId: load() and show() are separate calls in this module's
  // spec, but UnityAds 4.x's typed API requires holding onto the loaded ad object
  // between the two calls (there's no global placementId-based registry anymore).
  private var loadedInterstitials: [String: UADSInterstitialAd] = [:]
  private var loadedRewarded: [String: UADSRewardedAd] = [:]

  // NSLock.lock()/unlock() are `noasync` in Swift 6 — this keeps locking out of
  // `async` function bodies (a suspension point could otherwise occur while held).
  private func withStateLock<T>(_ body: () -> T) -> T {
    stateLock.lock()
    defer { stateLock.unlock() }
    return body()
  }

  func initialize(gameId: String, testMode: Bool) throws -> Promise<Void> {
    guard !gameId.isEmpty else {
      throw unityAdsError("Unity Ads game ID is empty")
    }

    return Promise.async {
      try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          self.stateLock.lock()
          if self.isInitialized {
            let existing = self.initializedGameId
            self.stateLock.unlock()
            if let existing, existing != gameId {
              continuation.resume(
                throwing: unityAdsError("Unity Ads SDK was already initialized with another game ID")
              )
            } else {
              continuation.resume()
            }
            return
          }

          if self.isInitializing, self.initializingGameId != gameId {
            self.stateLock.unlock()
            continuation.resume(
              throwing: unityAdsError("Unity Ads SDK is being initialized with another game ID")
            )
            return
          }

          self.initializationContinuations.append(continuation)
          if self.isInitializing {
            self.stateLock.unlock()
            return
          }
          self.isInitializing = true
          self.initializingGameId = gameId
          self.stateLock.unlock()

          let configuration = UADSInitializationConfigurationBuilder(gameId: gameId)
            .with(testMode: testMode)
            .build()
          UnityAds.initialize(configuration) { error in
            self.handleInitialization(
              error: error.map { unityAdsError($0.message, code: $0.code) }
            )
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
    let gameId = initializingGameId
    initializingGameId = nil
    if error == nil {
      isInitialized = true
      initializedGameId = gameId
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

  func load(adType: UnityAdType, placementId: String) throws -> Promise<Void> {
    guard !placementId.isEmpty else {
      throw unityAdsError("Unity Ads placement ID is empty")
    }

    return Promise.async {
      let configuration = UADSLoadConfigurationBuilder(placementId: placementId).build()

      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        switch adType {
        case .interstitial:
          DispatchQueue.main.async {
            UADSInterstitialAd.load(configuration) { ad, error in
              if let error {
                continuation.resume(throwing: unityAdsError(error.message, code: error.code))
                return
              }
              guard let ad else {
                continuation.resume(
                  throwing: unityAdsError("Unity interstitial ad failed to load")
                )
                return
              }
              self.stateLock.lock()
              self.loadedInterstitials[placementId] = ad
              self.stateLock.unlock()
              continuation.resume()
            }
          }
        case .rewarded:
          DispatchQueue.main.async {
            UADSRewardedAd.load(configuration) { ad, error in
              if let error {
                continuation.resume(throwing: unityAdsError(error.message, code: error.code))
                return
              }
              guard let ad else {
                continuation.resume(
                  throwing: unityAdsError("Unity rewarded ad failed to load")
                )
                return
              }
              self.stateLock.lock()
              self.loadedRewarded[placementId] = ad
              self.stateLock.unlock()
              continuation.resume()
            }
          }
        }
      }
    }
  }

  func show(
    adType: UnityAdType,
    placementId: String,
    verification: UnityAdVerificationOptions?
  ) throws -> Promise<UnityAdShowResult> {
    guard !placementId.isEmpty else {
      throw unityAdsError("Unity Ads placement ID is empty")
    }

    return Promise.async {
      let showConfiguration = try await self.buildShowConfiguration(verification: verification)

      switch adType {
      case .interstitial:
        return try await self.showInterstitial(placementId: placementId, showConfiguration: showConfiguration)
      case .rewarded:
        return try await self.showRewarded(placementId: placementId, showConfiguration: showConfiguration)
      }
    }
  }

  private func buildShowConfiguration(
    verification: UnityAdVerificationOptions?
  ) async throws -> UADSShowConfiguration {
    let viewController = try await currentViewController()
    var builder = UADSShowConfigurationBuilder().with(viewController: viewController)
    let extras = Self.extras(from: verification)
    if !extras.isEmpty {
      builder = builder.with(extras: extras)
    }
    return builder.build()
  }

  private static func extras(from verification: UnityAdVerificationOptions?) -> [String: String] {
    var extras: [String: String] = [:]
    if let userId = verification?.userId, !userId.isEmpty {
      extras["userId"] = userId
    }
    if let customData = verification?.customData, !customData.isEmpty {
      extras["customData"] = customData
    }
    return extras
  }

  private func showInterstitial(
    placementId: String,
    showConfiguration: UADSShowConfiguration
  ) async throws -> UnityAdShowResult {
    let ad = withStateLock { loadedInterstitials.removeValue(forKey: placementId) }
    guard let ad else {
      throw unityAdsError("Unity interstitial ad is not ready")
    }
    return try await withCheckedThrowingContinuation {
      (continuation: CheckedContinuation<UnityAdShowResult, Error>) in
      let delegate = InterstitialShowDelegate { result in continuation.resume(with: result) }
      RetainBox.retain(delegate)
      DispatchQueue.main.async {
        ad.show(showConfiguration, delegate: delegate)
      }
    }
  }

  private func showRewarded(
    placementId: String,
    showConfiguration: UADSShowConfiguration
  ) async throws -> UnityAdShowResult {
    let ad = withStateLock { loadedRewarded.removeValue(forKey: placementId) }
    guard let ad else {
      throw unityAdsError("Unity rewarded ad is not ready")
    }
    return try await withCheckedThrowingContinuation {
      (continuation: CheckedContinuation<UnityAdShowResult, Error>) in
      let delegate = RewardedShowDelegate { result in continuation.resume(with: result) }
      RetainBox.retain(delegate)
      DispatchQueue.main.async {
        ad.show(showConfiguration, delegate: delegate)
      }
    }
  }

  // UnityAds 4.19 exposes a single setUserConsent flag rather than separate
  // GDPR/CCPA signals, matching the old MetaData("gdpr.consent"/"privacy.consent")
  // behavior this replaces (both were already written un-inverted from `optIn`).
  func setGDPRConsent(optIn: Bool) throws {
    UnityAds.setUserConsent(optIn)
  }

  func setCCPAConsent(optIn: Bool) throws {
    UnityAds.setUserConsent(optIn)
  }

  func setCOPPA(isCoppa: Bool) throws {
    UnityAds.setNonBehavioral(isCoppa)
  }
}

private final class InterstitialShowDelegate: NSObject, UADSInterstitialShowDelegate, @unchecked Sendable {
  private let completion: (Result<UnityAdShowResult, Error>) -> Void

  init(completion: @escaping (Result<UnityAdShowResult, Error>) -> Void) {
    self.completion = completion
  }

  func showDidStart(_ unityAd: UADSInterstitialAd) {}

  func showDidClick(_ unityAd: UADSInterstitialAd) {}

  func showDidFail(_ unityAd: UADSInterstitialAd, error: UnityAdsError) {
    RetainBox.release(self)
    completion(.failure(unityAdsError(error.message, code: error.code)))
  }

  func showDidComplete(_ unityAd: UADSInterstitialAd, with finishState: UADSShowFinishState) {
    RetainBox.release(self)
    let state: UnityAdShowState = finishState == .completed ? .completed : .skipped
    completion(.success(UnityAdShowResult(state: state)))
  }
}

private final class RewardedShowDelegate: NSObject, UADSRewardedShowDelegate, @unchecked Sendable {
  private let completion: (Result<UnityAdShowResult, Error>) -> Void

  init(completion: @escaping (Result<UnityAdShowResult, Error>) -> Void) {
    self.completion = completion
  }

  func showDidStart(_ unityAd: UADSRewardedAd) {}

  func showDidClick(_ unityAd: UADSRewardedAd) {}

  func showDidReceiveReward(_ unityAd: UADSRewardedAd) {}

  func showDidFail(_ unityAd: UADSRewardedAd, error: UnityAdsError) {
    RetainBox.release(self)
    completion(.failure(unityAdsError(error.message, code: error.code)))
  }

  func showDidComplete(_ unityAd: UADSRewardedAd, with finishState: UADSShowFinishState) {
    RetainBox.release(self)
    let state: UnityAdShowState = finishState == .completed ? .completed : .skipped
    completion(.success(UnityAdShowResult(state: state)))
  }
}
