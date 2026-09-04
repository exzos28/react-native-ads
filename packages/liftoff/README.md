# @react-native-ads/liftoff

Liftoff Monetize (Vungle) — interstitial and rewarded video ads for React
Native.

[![npm version](https://img.shields.io/npm/v/@react-native-ads/liftoff.svg)](https://www.npmjs.com/package/@react-native-ads/liftoff)
[![license](https://img.shields.io/npm/l/@react-native-ads/liftoff.svg)](../../LICENSE)

## Features

- 🎯 Liftoff Monetize (Vungle) — interstitial and rewarded video
- ⚡️ [Nitro Modules](https://nitro.margelo.com/) — direct JSI bindings, no bridge overhead
- 📱 iOS & Android
- 🧩 Works with Expo out of the box — no config plugin needed
- 🔒 Fully typed API

## Installation

### React Native

```sh
npm install @react-native-ads/liftoff react-native-nitro-modules
cd ios && pod install
```

### Expo

```sh
npx expo install @react-native-ads/liftoff react-native-nitro-modules
npx expo prebuild
```

## API

### `MobileAds()`

| Method | Description |
| --- | --- |
| `initialize(appId: string): Promise<AdapterStatus[]>` | Initializes the Liftoff SDK. Call once before loading ads. |
| `setGDPRConsent(optIn: boolean, consentMessageVersion: string): void` | Forwards GDPR consent to the SDK. |
| `setCCPAConsent(optIn: boolean): void` | Forwards CCPA consent to the SDK. |
| `setCOPPA(isUserCoppa: boolean): void` | Flags the user as subject to COPPA. |

### `InterstitialAd`

| Member | Description |
| --- | --- |
| `InterstitialAd.createForAdRequest(adUnitId: string): InterstitialAd` | Creates a new interstitial for the given placement ID. |
| `load(): void` | Requests an ad. No-op if already loading/loaded. |
| `show(options?: { immersiveModeEnabled?: boolean }): Promise<void>` | Shows the loaded ad. Rejects if none is loaded. |
| `loaded: boolean` | Whether an ad is currently loaded. |
| `addAdEventListener(type: AdEventType, listener): () => void` | Subscribes to one event type; returns an unsubscribe function. |
| `addAdEventsListener(listener): () => void` | Subscribes to all event types at once. |
| `removeAllListeners(): void` | Removes every listener on this instance. |

### `RewardedAd`

Same shape as `InterstitialAd`, plus:

| Member | Description |
| --- | --- |
| `RewardedAd.createForAdRequest(adUnitId: string): RewardedAd` | Creates a new rewarded ad for the given placement ID. |
| `setUserId(userId: string): void` | Tags the ad with a user ID for SSV. Call before `show()`. |

`addAdEventListener`/`addAdEventsListener` also accept `RewardedAdEventType` values.

### Event types

| `AdEventType` | `RewardedAdEventType` |
| --- | --- |
| `LOADED`, `ERROR`, `OPENED`, `PAID`, `CLICKED`, `CLOSED` | `LOADED`, `EARNED_REWARD` |

## Usage

```ts
import MobileAds, {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
} from '@react-native-ads/liftoff';

await MobileAds().initialize('YOUR_LIFTOFF_APP_ID');
MobileAds().setGDPRConsent(true, '1.0');
MobileAds().setCCPAConsent(true);
MobileAds().setCOPPA(false);

const interstitial = InterstitialAd.createForAdRequest('YOUR_PLACEMENT_ID');
interstitial.addAdEventListener(AdEventType.LOADED, () => {
  interstitial.show({immersiveModeEnabled: true});
});
interstitial.addAdEventListener(AdEventType.CLOSED, () => {
  interstitial.load(); // reuse the same instance for the next impression
});
interstitial.load();

const rewarded = RewardedAd.createForAdRequest('YOUR_PLACEMENT_ID');
rewarded.setUserId('your-user-id'); // optional, for SSV
rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => rewarded.show());
rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
  // grant the reward
});
rewarded.load();
```

## Notes

- Ad instances are meant to be reused — call `load()` again on the same
  `InterstitialAd`/`RewardedAd` after `CLOSED` instead of creating a new one.
- Liftoff doesn't report reward type/amount, so `LOADED`/`EARNED_REWARD`
  payloads are always `undefined` — treat them as signals only.
- Use `RewardedAdEventType.LOADED`, not `AdEventType.LOADED`, on a
  `RewardedAd`.
- No built-in consent UI — gather consent with
  [`@react-native-ads/ump`](../ump) (or another CMP) and forward the result
  via `setGDPRConsent`/`setCCPAConsent`/`setCOPPA`.

See [`src/specs/LiftoffAds.nitro.ts`](src/specs/LiftoffAds.nitro.ts) for the
full native interface and [`example`](example) for a runnable demo.

## License

MIT
