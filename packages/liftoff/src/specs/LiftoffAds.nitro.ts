import type { HybridObject } from 'react-native-nitro-modules';

export type LiftoffAdEventType =
  | 'loaded'
  | 'error'
  | 'opened'
  | 'paid'
  | 'clicked'
  | 'closed'
  | 'rewarded_loaded'
  | 'rewarded_earned_reward';

export interface LiftoffAdShowOptions {
  immersiveModeEnabled?: boolean;
}

export interface LiftoffAdEventPayload {
  errorCode?: number;
  errorMessage?: string;
}

export interface LiftoffInterstitialAd extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  load(): void;
  show(options?: LiftoffAdShowOptions): Promise<void>;
  addAdEventListener(
    eventType: LiftoffAdEventType,
    listener: (payload?: LiftoffAdEventPayload) => void
  ): number;
  removeAdEventListener(subscriptionId: number): void;
  removeAllListeners(): void;
}

export interface LiftoffRewardedAd extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  load(): void;
  /**
   * Tags this ad with a user identifier for server-side verification (SSV)
   * of the reward. Must be called before `show()`.
   */
  setUserId(userId: string): void;
  show(options?: LiftoffAdShowOptions): Promise<void>;
  addAdEventListener(
    eventType: LiftoffAdEventType,
    listener: (payload?: LiftoffAdEventPayload) => void
  ): number;
  removeAdEventListener(subscriptionId: number): void;
  removeAllListeners(): void;
}

export interface LiftoffAds extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  initialize(appId: string): Promise<void>;

  setGDPRConsent(optIn: boolean, consentMessageVersion: string): void;
  setCCPAConsent(optIn: boolean): void;
  setCOPPA(isUserCoppa: boolean): void;

  createInterstitialAd(placementId: string): LiftoffInterstitialAd;
  createRewardedAd(placementId: string): LiftoffRewardedAd;
}
