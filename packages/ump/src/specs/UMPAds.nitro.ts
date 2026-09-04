import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Mirrors Google UMP's `ConsentStatus`/`ConsentInformation.ConsentStatus`.
 */
export type UMPConsentStatus =
  'unknown' | 'required' | 'notRequired' | 'obtained';

/**
 * Mirrors Google UMP's `PrivacyOptionsRequirementStatus`.
 */
export type UMPPrivacyOptionsRequirementStatus =
  'unknown' | 'required' | 'notRequired';

/**
 * Mirrors Google UMP's `DebugGeography`/`ConsentDebugSettings.DebugGeography`.
 * For testing only — forces the SDK to behave as if the device were in the
 * given region.
 */
export type UMPDebugGeography = 'disabled' | 'EEA' | 'notEEA';

export interface UMPConsentRequestOptions {
  /**
   * If `true`, the SDK skips consent gathering entirely (COPPA/child users).
   */
  tagForUnderAgeOfConsent?: boolean;
  /** Simulates a region for testing. Has no effect in production builds. */
  debugGeography?: UMPDebugGeography;
  /**
   * Device IDs (hashed on Android, advertising identifier-derived on iOS)
   * that are allowed to use `debugGeography`. Required by the SDK itself for
   * the debug geography to take effect on a real device.
   */
  testDeviceIds?: string[];
}

export interface UMPConsentInfo {
  status: UMPConsentStatus;
  /** Whether a consent form is currently available to load/show. */
  isConsentFormAvailable: boolean;
  privacyOptionsRequirementStatus: UMPPrivacyOptionsRequirementStatus;
  /** Whether the app is currently allowed to request ads. */
  canRequestAds: boolean;
}

export interface UMPAds extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  /**
   * Requests/refreshes consent info from Google's servers. Call this on
   * every app launch before deciding whether to show a consent form.
   */
  requestConsentInfoUpdate(
    options?: UMPConsentRequestOptions
  ): Promise<UMPConsentInfo>;

  /**
   * Loads and, if required, presents the consent form. No-ops (resolves
   * immediately) if no form is required.
   */
  loadAndShowConsentFormIfRequired(): Promise<UMPConsentInfo>;

  /**
   * Presents the "privacy options" form, letting the user revisit their
   * choice later (e.g. from a Settings screen). Only meaningful when
   * `privacyOptionsRequirementStatus` is `'required'`.
   */
  showPrivacyOptionsForm(): Promise<UMPConsentInfo>;

  /**
   * Unconditionally loads and presents the consent form, regardless of
   * `status`. Prefer `loadAndShowConsentFormIfRequired` unless you have a
   * specific reason to always show the form (e.g. a "reset consent" button).
   */
  showForm(): Promise<UMPConsentInfo>;

  /** Synchronously reads the last known consent info. */
  getConsentInfo(): UMPConsentInfo;

  /** Clears all consent state. Testing only. */
  reset(): void;

  /**
   * The raw IAB TCF v2 consent string (`IABTCF_TCString`), or `''` if none
   * has been written yet. Use `getUserChoices()`/`getTCModel()` for a
   * parsed, human-readable view of this string.
   */
  getTCString(): string;

  /** Whether GDPR applies to the current user (`IABTCF_gdprApplies`). */
  getGdprApplies(): boolean;

  /**
   * Raw per-purpose consent bitfield (`IABTCF_PurposeConsents`) — one `'0'`
   * or `'1'` character per IAB TCF purpose ID, 1-indexed at position 0.
   */
  getPurposeConsents(): string;

  /**
   * Raw per-purpose legitimate interest bitfield
   * (`IABTCF_PurposeLegitimateInterests`), same shape as
   * `getPurposeConsents()`.
   */
  getPurposeLegitimateInterests(): string;
}
