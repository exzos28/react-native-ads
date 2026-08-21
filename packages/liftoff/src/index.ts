import { NitroModules } from 'react-native-nitro-modules';

import type {
  LiftoffAdEventPayload,
  LiftoffAds,
  LiftoffInterstitialAd,
  LiftoffRewardedAd,
} from './specs/LiftoffAds.nitro';

export enum AdEventType {
  LOADED = 'loaded',
  ERROR = 'error',
  OPENED = 'opened',
  PAID = 'paid',
  CLICKED = 'clicked',
  CLOSED = 'closed',
}

export enum RewardedAdEventType {
  LOADED = 'rewarded_loaded',
  EARNED_REWARD = 'rewarded_earned_reward',
}

export type AdShowOptions = {
  immersiveModeEnabled?: boolean;
};

export type AdapterStatus = {
  name: string;
  description: string;
  state: InitializationState;
};

export enum InitializationState {
  AdapterInitializationStateNotReady = 0,
  AdapterInitializationStateReady = 1,
}

type PublicAdEventType = AdEventType | RewardedAdEventType;

export type AdEventPayload<T extends PublicAdEventType> =
  T extends AdEventType.ERROR ? Error : undefined;

export type AdEventListener<T extends PublicAdEventType> = (
  payload: AdEventPayload<T>
) => void;

export type AdEventsListener<T extends PublicAdEventType> = (event: {
  type: T;
  payload: AdEventPayload<T>;
}) => void;

const nativeAds = NitroModules.createHybridObject<LiftoffAds>('LiftoffAds');

function toPublicPayload(
  eventType: PublicAdEventType,
  payload?: LiftoffAdEventPayload
): Error | undefined {
  if (eventType === AdEventType.ERROR) {
    const error = new Error(
      payload?.errorMessage ?? 'Unknown Liftoff Ads error'
    );
    error.name = 'LiftoffAdsError';
    Object.assign(error, { code: String(payload?.errorCode ?? 'unknown') });
    return error;
  }

  return undefined;
}

abstract class MobileAd<
  TNative extends LiftoffInterstitialAd | LiftoffRewardedAd,
  TEvent extends PublicAdEventType,
> {
  private readonly listeners = new Map<TEvent, Set<AdEventListener<TEvent>>>();
  private readonly nativeSubscriptions = new Set<TEvent>();

  private loadedValue = false;
  private loadCalled = false;

  protected constructor(
    readonly adUnitId: string,
    protected readonly nativeAd: TNative,
    eventTypes: readonly TEvent[]
  ) {
    for (const eventType of eventTypes) {
      this.listeners.set(eventType, new Set());
      this.subscribeNative(eventType);
    }
  }

  private subscribeNative(eventType: TEvent): void {
    if (this.nativeSubscriptions.has(eventType)) {
      return;
    }

    this.nativeAd.addAdEventListener(eventType, (payload) => {
      if (
        eventType === AdEventType.LOADED ||
        eventType === RewardedAdEventType.LOADED
      ) {
        this.loadedValue = true;
      } else if (
        eventType === AdEventType.CLOSED ||
        eventType === AdEventType.ERROR
      ) {
        this.loadedValue = false;
        this.loadCalled = false;
      }

      const publicPayload = toPublicPayload(eventType, payload);
      for (const listener of this.listeners.get(eventType) ?? []) {
        listener(publicPayload as AdEventPayload<TEvent>);
      }
    });
    this.nativeSubscriptions.add(eventType);
  }

  get loaded(): boolean {
    return this.loadedValue;
  }

  load(): void {
    if (this.loadedValue || this.loadCalled) {
      return;
    }
    this.loadCalled = true;
    this.nativeAd.load();
  }

  show(options?: AdShowOptions): Promise<void> {
    if (!this.loadedValue) {
      throw new Error(
        `${this.constructor.name}.show() The requested ad has not loaded and could not be shown.`
      );
    }
    return this.nativeAd.show(options);
  }

  protected addListener<T extends TEvent>(
    type: T,
    listener: AdEventListener<T>
  ): () => void {
    if (typeof listener !== 'function') {
      throw new Error(
        `${this.constructor.name}.addAdEventListener(_, *) 'listener' expected a function.`
      );
    }

    const listeners = this.listeners.get(type);
    if (!listeners) {
      throw new Error(
        `${this.constructor.name}.addAdEventListener(*) 'type' expected a valid event type value.`
      );
    }

    this.subscribeNative(type);
    listeners.add(listener as AdEventListener<TEvent>);
    return () => listeners.delete(listener as AdEventListener<TEvent>);
  }

  protected addEventsListener<T extends TEvent>(
    listener: AdEventsListener<T>
  ): () => void {
    if (typeof listener !== 'function') {
      throw new Error(
        `${this.constructor.name}.addAdEventsListener(*) 'listener' expected a function.`
      );
    }

    const unsubscribers = [...this.listeners.keys()].map((type) =>
      this.addListener(type, (payload) =>
        listener({ type: type as T, payload: payload as AdEventPayload<T> })
      )
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  removeAllListeners(): void {
    for (const listeners of this.listeners.values()) {
      listeners.clear();
    }
    this.nativeAd.removeAllListeners();
    this.nativeSubscriptions.clear();
  }
}

const INTERSTITIAL_EVENTS = Object.values(AdEventType) as AdEventType[];
const REWARDED_EVENTS = [
  AdEventType.ERROR,
  AdEventType.OPENED,
  AdEventType.PAID,
  AdEventType.CLICKED,
  AdEventType.CLOSED,
  RewardedAdEventType.LOADED,
  RewardedAdEventType.EARNED_REWARD,
] as const;

export class InterstitialAd extends MobileAd<
  LiftoffInterstitialAd,
  AdEventType
> {
  static createForAdRequest(adUnitId: string): InterstitialAd {
    if (typeof adUnitId !== 'string' || adUnitId.length === 0) {
      throw new Error(
        "InterstitialAd.createForAdRequest(*) 'adUnitId' expected a non-empty string value."
      );
    }
    return new InterstitialAd(
      adUnitId,
      nativeAds.createInterstitialAd(adUnitId)
    );
  }

  private constructor(adUnitId: string, nativeAd: LiftoffInterstitialAd) {
    super(adUnitId, nativeAd, INTERSTITIAL_EVENTS);
  }

  addAdEventsListener<T extends AdEventType>(
    listener: AdEventsListener<T>
  ): () => void {
    return this.addEventsListener(listener);
  }

  addAdEventListener<T extends AdEventType>(
    type: T,
    listener: AdEventListener<T>
  ): () => void {
    return this.addListener(type, listener);
  }
}

type RewardedEventType = AdEventType | RewardedAdEventType;

export class RewardedAd extends MobileAd<LiftoffRewardedAd, RewardedEventType> {
  static createForAdRequest(adUnitId: string): RewardedAd {
    if (typeof adUnitId !== 'string' || adUnitId.length === 0) {
      throw new Error(
        "RewardedAd.createForAdRequest(*) 'adUnitId' expected a non-empty string value."
      );
    }
    return new RewardedAd(adUnitId, nativeAds.createRewardedAd(adUnitId));
  }

  private constructor(adUnitId: string, nativeAd: LiftoffRewardedAd) {
    super(adUnitId, nativeAd, REWARDED_EVENTS);
  }

  setUserId(userId: string): void {
    this.nativeAd.setUserId(userId);
  }

  addAdEventsListener<T extends RewardedEventType>(
    listener: AdEventsListener<T>
  ): () => void {
    return this.addEventsListener(listener);
  }

  addAdEventListener<T extends RewardedEventType>(
    type: T,
    listener: AdEventListener<T>
  ): () => void {
    if (type === AdEventType.LOADED) {
      throw new Error(
        'RewardedAd.addAdEventListener(*) use RewardedAdEventType.LOADED instead of AdEventType.LOADED.'
      );
    }
    return this.addListener(type, listener);
  }
}

export type MobileAdsModuleInterface = {
  initialize(appId: string): Promise<AdapterStatus[]>;
  setGDPRConsent(optIn: boolean, consentMessageVersion: string): void;
  setCCPAConsent(optIn: boolean): void;
  setCOPPA(isUserCoppa: boolean): void;
};

const mobileAdsInstance: MobileAdsModuleInterface = {
  async initialize(appId: string) {
    await nativeAds.initialize(appId);
    return [
      {
        name: 'LiftoffMonetize',
        description: 'Liftoff Monetize SDK is ready',
        state: InitializationState.AdapterInitializationStateReady,
      },
    ];
  },
  setGDPRConsent: (optIn, consentMessageVersion) =>
    nativeAds.setGDPRConsent(optIn, consentMessageVersion),
  setCCPAConsent: (optIn) => nativeAds.setCCPAConsent(optIn),
  setCOPPA: (isUserCoppa) => nativeAds.setCOPPA(isUserCoppa),
};

export const MobileAds = (): MobileAdsModuleInterface => mobileAdsInstance;

export default MobileAds;

export type {
  LiftoffAdEventPayload,
  LiftoffAdEventType,
  LiftoffAdShowOptions,
  LiftoffAds,
  LiftoffInterstitialAd,
  LiftoffRewardedAd,
} from './specs/LiftoffAds.nitro';
