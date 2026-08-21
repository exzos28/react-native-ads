import Foundation
import NitroModules
import PAGAdSDK

final class HybridPangleAds: HybridPangleAdsSpec, @unchecked Sendable {
  private let stateLock = NSLock()
  private var initializedAppId: String?
  private var initializingAppId: String?
  private var initializationContinuations: [CheckedContinuation<Void, Error>] = []
  private var isInitializing = false

  func initialize(appId: String) throws -> Promise<Void> {
    guard !appId.isEmpty else {
      throw pangleError("Pangle app ID is empty")
    }

    return Promise.async {
      try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          self.stateLock.lock()
          if let existing = self.initializedAppId {
            self.stateLock.unlock()
            if existing != appId {
              continuation.resume(
                throwing: pangleError("Pangle SDK was initialized with another app ID")
              )
            } else {
              continuation.resume()
            }
            return
          }

          if self.isInitializing, self.initializingAppId != appId {
            self.stateLock.unlock()
            continuation.resume(
              throwing: pangleError("Pangle SDK is being initialized with another app ID")
            )
            return
          }

          self.initializationContinuations.append(continuation)
          if self.isInitializing {
            self.stateLock.unlock()
            return
          }

          self.isInitializing = true
          self.initializingAppId = appId
          self.stateLock.unlock()

          let config = PAGConfig.share()
          config.appID = appId

          PAGSdk.start(with: config, completionHandler: { success, error in
            self.stateLock.lock()
            let continuations = self.initializationContinuations
            self.initializationContinuations.removeAll()
            self.isInitializing = false
            self.initializingAppId = nil
            if success { self.initializedAppId = appId }
            self.stateLock.unlock()

            continuations.forEach { item in
              if !success {
                item.resume(throwing: error ?? pangleError("Pangle SDK initialization failed"))
              } else {
                item.resume()
              }
            }
          })
        }
      }
    }
  }

  // PAGAdSDK 8.x collapsed the separate GDPRConsent/doNotSell properties into a single
  // paConsent flag, so GDPR and CCPA consent are no longer distinguishable on iOS.
  func setGDPRConsent(optIn: Bool) throws {
    runOnMain {
      PAGConfig.share().paConsent = optIn ? .consent : .noConsent
    }
  }

  func setCCPAConsent(optIn: Bool) throws {
    runOnMain {
      PAGConfig.share().paConsent = optIn ? .consent : .noConsent
    }
  }

  // PAGAdSDK 8.x removed the dedicated COPPA/child-directed API (PAGChildDirectedType);
  // there is no longer a public way to flag child-directed traffic to Pangle on iOS.
  func setCOPPA(isUserCoppa: Bool) throws {}

  func createInterstitialAd(
    placementId: String
  ) throws -> any HybridPangleInterstitialAdSpec {
    try requireInitialized(placementId: placementId)
    return HybridPangleInterstitialAd(placementId: placementId)
  }

  func createRewardedAd(
    placementId: String
  ) throws -> any HybridPangleRewardedAdSpec {
    try requireInitialized(placementId: placementId)
    return HybridPangleRewardedAd(placementId: placementId)
  }

  private func requireInitialized(placementId: String) throws {
    stateLock.lock()
    let initialized = initializedAppId != nil
    stateLock.unlock()

    guard initialized else {
      throw pangleError("Pangle SDK is not initialized")
    }
    guard !placementId.isEmpty else {
      throw pangleError("Pangle placement ID is empty")
    }
  }
}
