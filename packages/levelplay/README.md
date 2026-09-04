# @react-native-ads/levelplay

LevelPlay (ironSource) ad mediation — interstitial and rewarded video ads
for React Native.

[![npm version](https://img.shields.io/npm/v/@react-native-ads/levelplay.svg)](https://www.npmjs.com/package/@react-native-ads/levelplay)
[![license](https://img.shields.io/npm/l/@react-native-ads/levelplay.svg)](../../LICENSE)

## Features

- 🎯 LevelPlay (ironSource) mediation — interstitial and rewarded video
- ⚡️ [Nitro Modules](https://nitro.margelo.com/) — direct JSI bindings, no bridge overhead
- 📱 iOS & Android
- 🧩 Expo config plugin included — adds LevelPlay's Maven repo automatically
- 🔒 Fully typed API

## Installation

### React Native

```sh
npm install @react-native-ads/levelplay react-native-nitro-modules
cd ios && pod install
```

LevelPlay's Android SDK lives outside Google's default Maven repos — add
the repository to your app's `android/build.gradle` yourself:

```groovy
allprojects {
  repositories {
    maven { url "https://android-sdk.is.com/" }
  }
}
```

### Expo

```sh
npx expo install @react-native-ads/levelplay react-native-nitro-modules
```

Enable the bundled config plugin — it adds LevelPlay's Maven repo for you:

```json
{
  "expo": {
    "plugins": ["@react-native-ads/levelplay"]
  }
}
```

```sh
npx expo prebuild
```

## API

### `LevelPlayAds()`

| Method | Description |
| --- | --- |
| `initialize(appKey: string, options?: { testMode?: boolean }): Promise<void>` | Initializes the LevelPlay SDK. Call once before loading ads. |
| `load(adType: 'interstitial' \| 'rewarded', adUnitId: string): Promise<void>` | Requests an ad for the given ad unit. |
| `show(adType, adUnitId: string): Promise<{ state: 'completed' \| 'skipped' }>` | Shows a loaded ad. |
| `setGDPRConsent(optIn: boolean): void` | Forwards GDPR consent to the SDK. |
| `setCCPAConsent(optIn: boolean): void` | Forwards CCPA consent to the SDK. |
| `setCOPPA(isCoppa: boolean): void` | Flags the user as subject to COPPA. |

## Usage

There's no `InterstitialAd`/`RewardedAd` class or event listeners here —
just `load`/`show`, keyed by ad type and ad unit ID, resolving through
promises.

```ts
import LevelPlayAds from '@react-native-ads/levelplay';

await LevelPlayAds().initialize('YOUR_LEVELPLAY_APP_KEY', {testMode: true});
LevelPlayAds().setGDPRConsent(true);
LevelPlayAds().setCCPAConsent(true);
LevelPlayAds().setCOPPA(false);

await LevelPlayAds().load('interstitial', 'YOUR_AD_UNIT_ID');
const result = await LevelPlayAds().show('interstitial', 'YOUR_AD_UNIT_ID');
// result.state: 'completed' | 'skipped'

await LevelPlayAds().load('rewarded', 'YOUR_REWARDED_AD_UNIT_ID');
const rewardResult = await LevelPlayAds().show(
  'rewarded',
  'YOUR_REWARDED_AD_UNIT_ID',
);
if (rewardResult.state === 'completed') {
  // grant the reward
}
```

## Notes

- `load()`/`show()` reject on failure — no separate `ERROR` event.
- `result.state === 'completed'` is also how you know a rewarded ad earned
  its reward; LevelPlay doesn't send a distinct "reward earned" signal.
- Call `load()` again after each `show()` to prepare the next impression.
- No built-in consent UI (no UMP equivalent) — plug your own and forward the
  result via `setGDPRConsent`/`setCCPAConsent`/`setCOPPA`. If your app already
  uses [`react-native-google-mobile-ads`](https://docs.page/invertase/react-native-google-mobile-ads),
  its `AdsConsent` module (wraps Google's UMP SDK) is a good source for these
  booleans — no need to build a separate consent flow just for this package.

See [`src/specs/LevelPlayAds.nitro.ts`](src/specs/LevelPlayAds.nitro.ts) for
the full native interface and [`example`](example) for a runnable demo.

## License

MIT
