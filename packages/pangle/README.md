# @react-native-ads/pangle

Pangle — interstitial and rewarded video ads for React Native.

[![npm version](https://img.shields.io/npm/v/@react-native-ads/pangle.svg)](https://www.npmjs.com/package/@react-native-ads/pangle)
[![license](https://img.shields.io/npm/l/@react-native-ads/pangle.svg)](../../LICENSE)

## Features

- 🎯 Pangle — interstitial and rewarded video
- ⚡️ [Nitro Modules](https://nitro.margelo.com/) — direct JSI bindings, no bridge overhead
- 📱 iOS & Android
- 🧩 Expo CNG supported
- 🔒 Fully typed API

## Installation

### React Native

```sh
npm install @react-native-ads/pangle react-native-nitro-modules
cd ios && pod install
```

Pangle's Android SDK lives outside Google's default Maven repos — add the
repository to your app's `android/build.gradle` yourself:

```groovy
allprojects {
  repositories {
    maven { url "https://artifact.bytedance.com/repository/pangle" }
  }
}
```

### Expo

```sh
npx expo install @react-native-ads/pangle react-native-nitro-modules
```

Enable the bundled config plugin — it adds Pangle's Maven repo for you:

```json
{
  "expo": {
    "plugins": ["@react-native-ads/pangle"]
  }
}
```

```sh
npx expo prebuild
```

## API

### `MobileAds()`

| Method | Description |
| --- | --- |
| `initialize(appId: string): Promise<AdapterStatus[]>` | Initializes the Pangle SDK. Call once before loading ads. |
| `setGDPRConsent(optIn: boolean): void` | Forwards GDPR consent to the SDK. |
| `setCCPAConsent(optIn: boolean): void` | Forwards CCPA consent to the SDK. |
| `setCOPPA(isUserCoppa: boolean): void` | Flags the user as subject to COPPA. |

### `InterstitialAd`

| Member | Description |
| --- | --- |
| `InterstitialAd.createForAdRequest(adUnitId: string): InterstitialAd` | Creates a new interstitial for the given placement ID. |
| `load(): void` | Requests an ad. No-op if already loading/loaded. |
| `show(): Promise<void>` | Shows the loaded ad. Rejects if none is loaded. |
| `loaded: boolean` | Whether an ad is currently loaded. |
| `addAdEventListener(type: AdEventType, listener): () => void` | Subscribes to one event type; returns an unsubscribe function. |
| `addAdEventsListener(listener): () => void` | Subscribes to all event types at once. |
| `removeAllListeners(): void` | Removes every listener on this instance. |

### `RewardedAd`

Same shape as `InterstitialAd`, plus:

| Member | Description |
| --- | --- |
| `RewardedAd.createForAdRequest(adUnitId: string): RewardedAd` | Creates a new rewarded ad for the given placement ID. |
| `load(verification?: { mediaExtra?: string }): void` | Requests an ad; `mediaExtra` is forwarded to Pangle's SSV callback. |

`addAdEventListener`/`addAdEventsListener` also accept `RewardedAdEventType` values.

### Event types

| `AdEventType` | `RewardedAdEventType` |
| --- | --- |
| `LOADED`, `ERROR`, `OPENED`, `CLICKED`, `CLOSED` | `LOADED`, `EARNED_REWARD` |

## Usage

```ts
import MobileAds, {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
} from '@react-native-ads/pangle';

await MobileAds().initialize('YOUR_PANGLE_APP_ID');
MobileAds().setGDPRConsent(true);
MobileAds().setCCPAConsent(true);
MobileAds().setCOPPA(false);

const interstitial = InterstitialAd.createForAdRequest('YOUR_PLACEMENT_ID');
interstitial.addAdEventListener(AdEventType.LOADED, () => interstitial.show());
interstitial.addAdEventListener(AdEventType.CLOSED, () => {
  interstitial.load(); // reuse the same instance for the next impression
});
interstitial.load();

const rewarded = RewardedAd.createForAdRequest('YOUR_PLACEMENT_ID');
rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => rewarded.show());
rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
  // grant the reward
});
rewarded.load({mediaExtra: 'your-user-id'}); // optional, for SSV
```

## Notes

- Ad instances are meant to be reused — call `load()` again on the same
  `InterstitialAd`/`RewardedAd` after `CLOSED` instead of creating a new one.
- No `AdEventType.PAID` event (unlike Liftoff/Google Mobile Ads).
- Pangle doesn't report reward type/amount, so `LOADED`/`EARNED_REWARD`
  payloads are always `undefined` — treat them as signals only.
- Use `RewardedAdEventType.LOADED`, not `AdEventType.LOADED`, on a
  `RewardedAd`.
- No built-in consent UI — gather consent with
  [`@react-native-ads/ump`](../ump) (or another CMP) and forward the result
  via `setGDPRConsent`/`setCCPAConsent`/`setCOPPA`.

See [`src/specs/PangleAds.nitro.ts`](src/specs/PangleAds.nitro.ts) for the
full native interface and [`example`](example) for a runnable demo.

## License

MIT
