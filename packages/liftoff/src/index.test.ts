import type {
  LiftoffAdEventPayload,
  LiftoffAdEventType,
} from './specs/LiftoffAds.nitro';

type Listener = (payload?: LiftoffAdEventPayload) => void;

class MockNativeAd {
  load = jest.fn();
  show = jest.fn(async () => undefined);
  removeAllListeners = jest.fn(() => {
    this.listeners.clear();
  });

  private listeners = new Map<LiftoffAdEventType, Set<Listener>>();
  private nextId = 1;
  private idToEntry = new Map<
    number,
    { type: LiftoffAdEventType; listener: Listener }
  >();

  addAdEventListener = jest.fn(
    (eventType: LiftoffAdEventType, listener: Listener) => {
      const set = this.listeners.get(eventType) ?? new Set<Listener>();
      set.add(listener);
      this.listeners.set(eventType, set);
      const id = this.nextId++;
      this.idToEntry.set(id, { type: eventType, listener });
      return id;
    }
  );

  removeAdEventListener = jest.fn((subscriptionId: number) => {
    const entry = this.idToEntry.get(subscriptionId);
    if (!entry) {
      return;
    }
    this.listeners.get(entry.type)?.delete(entry.listener);
    this.idToEntry.delete(subscriptionId);
  });

  emit(eventType: LiftoffAdEventType, payload?: LiftoffAdEventPayload): void {
    for (const listener of this.listeners.get(eventType) ?? []) {
      listener(payload);
    }
  }
}

const mockCreatedInterstitials: MockNativeAd[] = [];
const mockCreatedRewarded: MockNativeAd[] = [];

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({
      initialize: jest.fn(async () => undefined),
      setGDPRConsent: jest.fn(),
      setCCPAConsent: jest.fn(),
      setCOPPA: jest.fn(),
      createInterstitialAd: jest.fn(() => {
        const ad = new MockNativeAd();
        mockCreatedInterstitials.push(ad);
        return ad;
      }),
      createRewardedAd: jest.fn(() => {
        const ad = new MockNativeAd();
        mockCreatedRewarded.push(ad);
        return ad;
      }),
    }),
  },
}));

import {
  AdEventType,
  InterstitialAd,
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
} from './index';

beforeEach(() => {
  mockCreatedInterstitials.length = 0;
  mockCreatedRewarded.length = 0;
});

describe('InterstitialAd.createForAdRequest', () => {
  it('throws for an empty ad unit id', () => {
    expect(() => InterstitialAd.createForAdRequest('')).toThrow(
      /expected a non-empty string value/
    );
  });

  it('creates a native ad for a valid ad unit id', () => {
    InterstitialAd.createForAdRequest('unit-1');
    expect(mockCreatedInterstitials).toHaveLength(1);
  });
});

describe('InterstitialAd load/show lifecycle', () => {
  it('is not loaded until the native LOADED event fires', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    expect(ad.loaded).toBe(false);

    ad.load();
    expect(mockCreatedInterstitials[0]!.load).toHaveBeenCalledTimes(1);
    expect(ad.loaded).toBe(false);

    mockCreatedInterstitials[0]!.emit('loaded');
    expect(ad.loaded).toBe(true);
  });

  it('does not call native load twice while a load is pending', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    ad.load();
    ad.load();
    expect(mockCreatedInterstitials[0]!.load).toHaveBeenCalledTimes(1);
  });

  it('throws synchronously when show() is called before the ad has loaded', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    expect(() => ad.show()).toThrow(/has not loaded and could not be shown/);
  });

  it('delegates to the native ad once loaded', async () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    mockCreatedInterstitials[0]!.emit('loaded');

    await ad.show({ immersiveModeEnabled: true });
    expect(mockCreatedInterstitials[0]!.show).toHaveBeenCalledWith({
      immersiveModeEnabled: true,
    });
  });

  it('resets loaded/load state on CLOSED so the ad can be reloaded', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    ad.load();
    mockCreatedInterstitials[0]!.emit('loaded');
    mockCreatedInterstitials[0]!.emit('closed');

    expect(ad.loaded).toBe(false);
    ad.load();
    expect(mockCreatedInterstitials[0]!.load).toHaveBeenCalledTimes(2);
  });

  it('resets loaded/load state on ERROR so the ad can be retried', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    ad.load();
    mockCreatedInterstitials[0]!.emit('error', { errorMessage: 'boom' });

    expect(ad.loaded).toBe(false);
    ad.load();
    expect(mockCreatedInterstitials[0]!.load).toHaveBeenCalledTimes(2);
  });
});

describe('InterstitialAd error payload', () => {
  it('maps the native error payload to a JS Error', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    const handler = jest.fn();
    ad.addAdEventListener(AdEventType.ERROR, handler);

    mockCreatedInterstitials[0]!.emit('error', {
      errorCode: 42,
      errorMessage: 'no fill',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const error = handler.mock.calls[0][0] as Error;
    expect(error.message).toBe('no fill');
    expect((error as Error & { code: string }).code).toBe('42');
  });
});

describe('InterstitialAd listener subscriptions', () => {
  it('stops notifying a listener after it unsubscribes', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    const handler = jest.fn();
    const unsubscribe = ad.addAdEventListener(AdEventType.OPENED, handler);

    mockCreatedInterstitials[0]!.emit('opened');
    unsubscribe();
    mockCreatedInterstitials[0]!.emit('opened');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removeAllListeners clears listeners and forwards to the native ad', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    const handler = jest.fn();
    ad.addAdEventListener(AdEventType.OPENED, handler);

    ad.removeAllListeners();
    expect(
      mockCreatedInterstitials[0]!.removeAllListeners
    ).toHaveBeenCalledTimes(1);

    mockCreatedInterstitials[0]!.emit('opened');
    expect(handler).not.toHaveBeenCalled();
  });

  it('addAdEventsListener receives every event type for the ad', () => {
    const ad = InterstitialAd.createForAdRequest('unit-1');
    const handler = jest.fn();
    ad.addAdEventsListener(handler);

    mockCreatedInterstitials[0]!.emit('opened');
    mockCreatedInterstitials[0]!.emit('clicked');

    expect(handler).toHaveBeenCalledWith({
      type: 'opened',
      payload: undefined,
    });
    expect(handler).toHaveBeenCalledWith({
      type: 'clicked',
      payload: undefined,
    });
  });
});

describe('RewardedAd', () => {
  it('rejects AdEventType.LOADED in favor of RewardedAdEventType.LOADED', () => {
    const ad = RewardedAd.createForAdRequest('unit-1');
    expect(() =>
      ad.addAdEventListener(AdEventType.LOADED as never, jest.fn())
    ).toThrow(/use RewardedAdEventType.LOADED/);
  });

  it('does not fabricate reward data for LOADED or EARNED_REWARD events', () => {
    const ad = RewardedAd.createForAdRequest('unit-1');
    const onLoaded = jest.fn();
    const onEarned = jest.fn();
    ad.addAdEventListener(RewardedAdEventType.LOADED, onLoaded);
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, onEarned);

    mockCreatedRewarded[0]!.emit('rewarded_loaded');
    mockCreatedRewarded[0]!.emit('rewarded_earned_reward');

    expect(onLoaded).toHaveBeenCalledWith(undefined);
    expect(onEarned).toHaveBeenCalledWith(undefined);
  });

  it('marks the ad as loaded on RewardedAdEventType.LOADED', () => {
    const ad = RewardedAd.createForAdRequest('unit-1');
    expect(ad.loaded).toBe(false);
    mockCreatedRewarded[0]!.emit('rewarded_loaded');
    expect(ad.loaded).toBe(true);
  });
});

describe('MobileAds()', () => {
  it('reports a ready adapter status after initialize resolves', async () => {
    const statuses = await MobileAds().initialize('app-id');
    expect(statuses).toEqual([
      expect.objectContaining({ name: 'LiftoffMonetize', state: 1 }),
    ]);
  });
});
