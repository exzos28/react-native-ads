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
 * reward. The Pangle SDK only reads the `media_extra` key from
 * `extraInfo` — any other key (including a literal `userId`/`customData`)
 * is silently ignored and the S2S callback's `user_id` stays "defaultUser"
 * (confirmed with Pangle support). Only `userId` is sent as `media_extra`;
 * `customData` is not supported by this provider.
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
