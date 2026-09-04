import Foundation
import NitroModules
import UIKit
import UserMessagingPlatform

final class HybridUMPAds: HybridUMPAdsSpec, @unchecked Sendable {
  func requestConsentInfoUpdate(options: UMPConsentRequestOptions?) throws -> Promise<UMPConsentInfo> {
    Promise.async {
      let parameters = RequestParameters()
      parameters.isTaggedForUnderAgeOfConsent = options?.tagForUnderAgeOfConsent ?? false

      if let debugGeography = options?.debugGeography {
        let debugSettings = DebugSettings()
        debugSettings.geography = debugGeography.toNative()
        if let testDeviceIds = options?.testDeviceIds {
          debugSettings.testDeviceIdentifiers = testDeviceIds
        }
        parameters.debugSettings = debugSettings
      }

      // Must run on the main thread/queue — the UMP SDK is not thread-safe
      // and this call can synchronously create UI-related state.
      try await Self.performRequestConsentInfoUpdate(parameters)

      return Self.consentInfo()
    }
  }

  func loadAndShowConsentFormIfRequired() throws -> Promise<UMPConsentInfo> {
    Promise.async {
      let viewController = try await currentViewController()
      // ConsentForm.loadAndPresentIfRequired() creates a WKWebView and must
      // run on the main thread — `await`ing off of `currentViewController()`
      // does not itself guarantee that, so hop explicitly.
      try await Self.performLoadAndPresentIfRequired(from: viewController)
      return Self.consentInfo()
    }
  }

  func showPrivacyOptionsForm() throws -> Promise<UMPConsentInfo> {
    Promise.async {
      let viewController = try await currentViewController()
      try await Self.performPresentPrivacyOptionsForm(from: viewController)
      return Self.consentInfo()
    }
  }

  func showForm() throws -> Promise<UMPConsentInfo> {
    Promise.async {
      let viewController = try await currentViewController()
      try await Self.performShowForm(from: viewController)
      return Self.consentInfo()
    }
  }

  @MainActor
  private static func performRequestConsentInfoUpdate(_ parameters: RequestParameters) async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { error in
        if let error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume()
        }
      }
    }
  }

  @MainActor
  private static func performLoadAndPresentIfRequired(from viewController: UIViewController) async throws {
    try await ConsentForm.loadAndPresentIfRequired(from: viewController)
  }

  @MainActor
  private static func performPresentPrivacyOptionsForm(from viewController: UIViewController) async throws {
    try await ConsentForm.presentPrivacyOptionsForm(from: viewController)
  }

  @MainActor
  private static func performShowForm(from viewController: UIViewController) async throws {
    let form = try await ConsentForm.load()
    try await form.present(from: viewController)
  }

  func getConsentInfo() throws -> UMPConsentInfo {
    Self.consentInfo()
  }

  func reset() throws {
    runOnMain { ConsentInformation.shared.reset() }
  }

  func getTCString() throws -> String {
    UserDefaults.standard.string(forKey: "IABTCF_TCString") ?? ""
  }

  func getGdprApplies() throws -> Bool {
    UserDefaults.standard.bool(forKey: "IABTCF_gdprApplies")
  }

  func getPurposeConsents() throws -> String {
    UserDefaults.standard.string(forKey: "IABTCF_PurposeConsents") ?? ""
  }

  func getPurposeLegitimateInterests() throws -> String {
    UserDefaults.standard.string(forKey: "IABTCF_PurposeLegitimateInterests") ?? ""
  }

  private static func consentInfo() -> UMPConsentInfo {
    UMPConsentInfo(
      status: ConsentInformation.shared.consentStatus.toUMP(),
      isConsentFormAvailable: ConsentInformation.shared.formStatus == .available,
      privacyOptionsRequirementStatus: ConsentInformation.shared.privacyOptionsRequirementStatus.toUMP(),
      canRequestAds: ConsentInformation.shared.canRequestAds
    )
  }
}

private extension ConsentStatus {
  func toUMP() -> UMPConsentStatus {
    switch self {
    case .required: return .required
    case .notRequired: return .notrequired
    case .obtained: return .obtained
    default: return .unknown
    }
  }
}

private extension PrivacyOptionsRequirementStatus {
  func toUMP() -> UMPPrivacyOptionsRequirementStatus {
    switch self {
    case .required: return .required
    case .notRequired: return .notrequired
    default: return .unknown
    }
  }
}

private extension UMPDebugGeography {
  func toNative() -> DebugGeography {
    switch self {
    case .eea: return .EEA
    case .noteea: return .notEEA
    case .disabled: return .disabled
    }
  }
}
