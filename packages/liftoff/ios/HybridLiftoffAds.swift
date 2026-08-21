import Foundation
import NitroModules
import VungleAdsSDK

final class HybridLiftoffAds: HybridLiftoffAdsSpec, @unchecked Sendable {
  private let stateLock = NSLock()
  private var initializedAppId: String?
  private var initializingAppId: String?
  private var initializationContinuations: [CheckedContinuation<Void, Error>] = []
  private var isInitializing = false

  func initialize(appId: String) throws -> Promise<Void> {
    guard !appId.isEmpty else {
      throw liftoffError("Liftoff app ID is empty")
    }

    return Promise.async {
      try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          self.stateLock.lock()
          if VungleAds.isInitialized() {
            let existing = self.initializedAppId
            if existing == nil { self.initializedAppId = appId }
            self.stateLock.unlock()

            if let existing, existing != appId {
              continuation.resume(
                throwing: liftoffError("Liftoff SDK was initialized with another app ID")
              )
            } else {
              continuation.resume()
            }
            return
          }

          if self.isInitializing, self.initializingAppId != appId {
            self.stateLock.unlock()
            continuation.resume(
              throwing: liftoffError("Liftoff SDK is being initialized with another app ID")
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

          VungleAds.initWithAppId(appId) { error in
            self.stateLock.lock()
            let continuations = self.initializationContinuations
            self.initializationContinuations.removeAll()
            self.isInitializing = false
            self.initializingAppId = nil
            if error == nil { self.initializedAppId = appId }
            self.stateLock.unlock()

            continuations.forEach { item in
              if let error {
                item.resume(throwing: error)
              } else {
                item.resume()
              }
            }
          }
        }
      }
    }
  }

  func setGDPRConsent(optIn: Bool, consentMessageVersion: String) throws {
    runOnMain {
      VunglePrivacySettings.setGDPRStatus(optIn)
      VunglePrivacySettings.setGDPRMessageVersion(consentMessageVersion)
    }
  }

  func setCCPAConsent(optIn: Bool) throws {
    runOnMain { VunglePrivacySettings.setCCPAStatus(optIn) }
  }

  func setCOPPA(isUserCoppa: Bool) throws {
    runOnMain { VunglePrivacySettings.setCOPPAStatus(isUserCoppa) }
  }

  func createInterstitialAd(
    placementId: String
  ) throws -> any HybridLiftoffInterstitialAdSpec {
    try requireInitialized(placementId: placementId)
    return HybridLiftoffInterstitialAd(placementId: placementId)
  }

  func createRewardedAd(
    placementId: String
  ) throws -> any HybridLiftoffRewardedAdSpec {
    try requireInitialized(placementId: placementId)
    return HybridLiftoffRewardedAd(placementId: placementId)
  }

  private func requireInitialized(placementId: String) throws {
    guard VungleAds.isInitialized() else {
      throw liftoffError("Liftoff SDK is not initialized")
    }
    guard !placementId.isEmpty else {
      throw liftoffError("Liftoff placement ID is empty")
    }
  }
}
