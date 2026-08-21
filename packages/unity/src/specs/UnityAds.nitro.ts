import type { HybridObject } from 'react-native-nitro-modules';

export type UnityAdShowState = 'completed' | 'skipped';

export interface UnityAdShowResult {
  state: UnityAdShowState;
}

// UnityAds 4.x replaced the untyped placementId-only load/show API with typed
// InterstitialAd/RewardedAd (iOS: UADSInterstitialAd/UADSRewardedAd) classes, so the
// native side now needs to know the ad type upfront to pick the right class.
export type UnityAdType = 'interstitial' | 'rewarded';

/**
 * Passed through as show-time `extras` on `UADSShowConfiguration` /
 * `ShowConfiguration` for server-side verification (SSV) of rewarded ads.
 * Ignored for interstitials.
 */
export interface UnityAdVerificationOptions {
  userId?: string;
  customData?: string;
}

export interface UnityAds extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  initialize(gameId: string, testMode: boolean): Promise<void>;

  load(adType: UnityAdType, placementId: string): Promise<void>;
  show(
    adType: UnityAdType,
    placementId: string,
    verification?: UnityAdVerificationOptions
  ): Promise<UnityAdShowResult>;

  setGDPRConsent(optIn: boolean): void;
  setCCPAConsent(optIn: boolean): void;
  setCOPPA(isCoppa: boolean): void;
}
