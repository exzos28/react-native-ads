import type { HybridObject } from 'react-native-nitro-modules';

export type LevelPlayAdShowState = 'completed' | 'skipped';

export interface LevelPlayAdShowResult {
  state: LevelPlayAdShowState;
}

export type LevelPlayAdType = 'interstitial' | 'rewarded';

export interface LevelPlayAds extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  initialize(appKey: string, testMode: boolean): Promise<void>;

  load(adType: LevelPlayAdType, adUnitId: string): Promise<void>;
  show(
    adType: LevelPlayAdType,
    adUnitId: string
  ): Promise<LevelPlayAdShowResult>;

  setGDPRConsent(optIn: boolean): void;
  setCCPAConsent(optIn: boolean): void;
  setCOPPA(isCoppa: boolean): void;
}
