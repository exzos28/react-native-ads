import type { HybridObject } from 'react-native-nitro-modules';

export type PangleAdEventType =
  | 'loaded'
  | 'error'
  | 'opened'
  | 'clicked'
  | 'closed'
  | 'rewarded_loaded'
  | 'rewarded_earned_reward';

export interface PangleAdEventPayload {
  errorCode?: number;
  errorMessage?: string;
}

export interface PangleInterstitialAd extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  load(): void;
  show(): Promise<void>;
  addAdEventListener(
    eventType: PangleAdEventType,
    listener: (payload?: PangleAdEventPayload) => void
  ): number;
  removeAdEventListener(subscriptionId: number): void;
  removeAllListeners(): void;
}

/**
 * Passed as request `extraInfo` for server-side verification (SSV) of the
 * reward.
 */
export interface PangleAdVerificationOptions {
  userId?: string;
  customData?: string;
}

export interface PangleRewardedAd extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  load(verification?: PangleAdVerificationOptions): void;
  show(): Promise<void>;
  addAdEventListener(
    eventType: PangleAdEventType,
    listener: (payload?: PangleAdEventPayload) => void
  ): number;
  removeAdEventListener(subscriptionId: number): void;
  removeAllListeners(): void;
}

export interface PangleAds extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  initialize(appId: string): Promise<void>;

  setGDPRConsent(optIn: boolean): void;
  setCCPAConsent(optIn: boolean): void;
  setCOPPA(isUserCoppa: boolean): void;

  createInterstitialAd(placementId: string): PangleInterstitialAd;
  createRewardedAd(placementId: string): PangleRewardedAd;
}
