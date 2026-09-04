import { NitroModules } from 'react-native-nitro-modules';
import { TCModel, TCString } from '@iabtcf/core';

import type {
  UMPAds as NativeUMPAds,
  UMPConsentInfo,
  UMPConsentRequestOptions,
} from './specs/UMPAds.nitro';

/**
 * IAB TCF v2 purpose IDs, as used by `getPurposeConsents()`/
 * `getPurposeLegitimateInterests()` (1-indexed) and by `TCModel.purposeConsents`.
 * https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */
export enum UMPPurpose {
  STORE_AND_ACCESS_INFORMATION_ON_DEVICE = 1,
  SELECT_BASIC_ADS = 2,
  CREATE_A_PERSONALISED_ADS_PROFILE = 3,
  SELECT_PERSONALISED_ADS = 4,
  CREATE_A_PERSONALISED_CONTENT_PROFILE = 5,
  SELECT_PERSONALISED_CONTENT = 6,
  MEASURE_AD_PERFORMANCE = 7,
  MEASURE_CONTENT_PERFORMANCE = 8,
  APPLY_MARKET_RESEARCH_TO_GENERATE_AUDIENCE_INSIGHTS = 9,
  DEVELOP_AND_IMPROVE_PRODUCTS = 10,
}

/** IAB TCF v2 special feature IDs, as used by `TCModel.specialFeatureOptins`. */
export enum UMPSpecialFeature {
  USE_PRECISE_GEOLOCATION_DATA = 1,
  ACTIVELY_SCAN_DEVICE_CHARACTERISTICS_FOR_IDENTIFICATION = 2,
}

/** A user-friendly view of the 10 IAB TCF purposes + 2 special features. */
export interface UMPUserChoices {
  storeAndAccessInformationOnDevice: boolean;
  selectBasicAds: boolean;
  createAPersonalisedAdsProfile: boolean;
  selectPersonalisedAds: boolean;
  createAPersonalisedContentProfile: boolean;
  selectPersonalisedContent: boolean;
  measureAdPerformance: boolean;
  measureContentPerformance: boolean;
  applyMarketResearchToGenerateAudienceInsights: boolean;
  developAndImproveProducts: boolean;
  usePreciseGeolocationData: boolean;
  activelyScanDeviceCharacteristicsForIdentification: boolean;
}

export interface UMPAdsModuleInterface {
  requestConsentInfoUpdate(
    options?: UMPConsentRequestOptions
  ): Promise<UMPConsentInfo>;
  loadAndShowConsentFormIfRequired(): Promise<UMPConsentInfo>;
  showPrivacyOptionsForm(): Promise<UMPConsentInfo>;
  showForm(): Promise<UMPConsentInfo>;
  /**
   * Convenience helper combining `requestConsentInfoUpdate` and
   * `loadAndShowConsentFormIfRequired` — the common "on every app launch"
   * flow in one call.
   */
  gatherConsent(options?: UMPConsentRequestOptions): Promise<UMPConsentInfo>;
  getConsentInfo(): UMPConsentInfo;
  reset(): void;
  getTCString(): string;
  /** Parses `getTCString()` into a full IAB TCF `TCModel` (`@iabtcf/core`). */
  getTCModel(): TCModel;
  getGdprApplies(): boolean;
  getPurposeConsents(): string;
  getPurposeLegitimateInterests(): string;
  /** A user-friendly, decoded view of `getTCModel()`'s purpose consents. */
  getUserChoices(): UMPUserChoices;
}

const nativeUMPAds = NitroModules.createHybridObject<NativeUMPAds>('UMPAds');

function decodeTCModel(): TCModel {
  const tcString = nativeUMPAds.getTCString();
  if (!tcString) {
    return new TCModel();
  }
  try {
    return TCString.decode(tcString);
  } catch {
    return new TCModel();
  }
}

const umpAdsInstance: UMPAdsModuleInterface = {
  requestConsentInfoUpdate: (options) =>
    nativeUMPAds.requestConsentInfoUpdate(options),
  loadAndShowConsentFormIfRequired: () =>
    nativeUMPAds.loadAndShowConsentFormIfRequired(),
  showPrivacyOptionsForm: () => nativeUMPAds.showPrivacyOptionsForm(),
  showForm: () => nativeUMPAds.showForm(),
  gatherConsent: async (options) => {
    await nativeUMPAds.requestConsentInfoUpdate(options);
    return nativeUMPAds.loadAndShowConsentFormIfRequired();
  },
  getConsentInfo: () => nativeUMPAds.getConsentInfo(),
  reset: () => nativeUMPAds.reset(),
  getTCString: () => nativeUMPAds.getTCString(),
  getTCModel: decodeTCModel,
  getGdprApplies: () => nativeUMPAds.getGdprApplies(),
  getPurposeConsents: () => nativeUMPAds.getPurposeConsents(),
  getPurposeLegitimateInterests: () =>
    nativeUMPAds.getPurposeLegitimateInterests(),
  getUserChoices: () => {
    const tcModel = decodeTCModel();
    return {
      storeAndAccessInformationOnDevice: tcModel.purposeConsents.has(
        UMPPurpose.STORE_AND_ACCESS_INFORMATION_ON_DEVICE
      ),
      selectBasicAds: tcModel.purposeConsents.has(UMPPurpose.SELECT_BASIC_ADS),
      createAPersonalisedAdsProfile: tcModel.purposeConsents.has(
        UMPPurpose.CREATE_A_PERSONALISED_ADS_PROFILE
      ),
      selectPersonalisedAds: tcModel.purposeConsents.has(
        UMPPurpose.SELECT_PERSONALISED_ADS
      ),
      createAPersonalisedContentProfile: tcModel.purposeConsents.has(
        UMPPurpose.CREATE_A_PERSONALISED_CONTENT_PROFILE
      ),
      selectPersonalisedContent: tcModel.purposeConsents.has(
        UMPPurpose.SELECT_PERSONALISED_CONTENT
      ),
      measureAdPerformance: tcModel.purposeConsents.has(
        UMPPurpose.MEASURE_AD_PERFORMANCE
      ),
      measureContentPerformance: tcModel.purposeConsents.has(
        UMPPurpose.MEASURE_CONTENT_PERFORMANCE
      ),
      applyMarketResearchToGenerateAudienceInsights:
        tcModel.purposeConsents.has(
          UMPPurpose.APPLY_MARKET_RESEARCH_TO_GENERATE_AUDIENCE_INSIGHTS
        ),
      developAndImproveProducts: tcModel.purposeConsents.has(
        UMPPurpose.DEVELOP_AND_IMPROVE_PRODUCTS
      ),
      usePreciseGeolocationData: tcModel.specialFeatureOptins.has(
        UMPSpecialFeature.USE_PRECISE_GEOLOCATION_DATA
      ),
      activelyScanDeviceCharacteristicsForIdentification:
        tcModel.specialFeatureOptins.has(
          UMPSpecialFeature.ACTIVELY_SCAN_DEVICE_CHARACTERISTICS_FOR_IDENTIFICATION
        ),
    };
  },
};

export const UMPAds = (): UMPAdsModuleInterface => umpAdsInstance;

export default UMPAds;

export type {
  UMPAds as UMPAdsSpec,
  UMPConsentInfo,
  UMPConsentRequestOptions,
  UMPConsentStatus,
  UMPDebugGeography,
  UMPPrivacyOptionsRequirementStatus,
} from './specs/UMPAds.nitro';
