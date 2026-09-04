# @react-native-ads/unity

Unity Ads — interstitial and rewarded video ads for React Native.

[![npm version](https://img.shields.io/npm/v/@react-native-ads/unity.svg)](https://www.npmjs.com/package/@react-native-ads/unity)
[![license](https://img.shields.io/npm/l/@react-native-ads/unity.svg)](../../LICENSE)

## Features

- 🎮 Unity Ads — interstitial and rewarded video
- ⚡️ [Nitro Modules](https://nitro.margelo.com/) — direct JSI bindings, no bridge overhead
- 📱 iOS & Android
- 🧩 Works with Expo out of the box — no config plugin needed
- 🔒 Fully typed API

## Installation

### React Native

```sh
npm install @react-native-ads/unity react-native-nitro-modules
cd ios && pod install
```

### Expo

```sh
npx expo install @react-native-ads/unity react-native-nitro-modules
npx expo prebuild
```

## API

### `UnityAds()`

| Method | Description |
| --- | --- |
| `initialize(gameId: string, options?: { testMode?: boolean }): Promise<void>` | Initializes the Unity Ads SDK. Call once before loading ads. |
| `load(adType: 'interstitial' \| 'rewarded', placementId: string): Promise<void>` | Requests an ad for the given placement. |
| `show(adType, placementId: string, verification?: { userId?: string; customData?: string }): Promise<{ state: 'completed' \| 'skipped' }>` | Shows a loaded ad. `verification` is forwarded for rewarded SSV and ignored for interstitials. |
| `setGDPRConsent(optIn: boolean): void` | Forwards GDPR consent to the SDK. |
| `setCCPAConsent(optIn: boolean): void` | Forwards CCPA consent to the SDK. |
| `setCOPPA(isCoppa: boolean): void` | Flags the user as subject to COPPA. |

## Usage

Unlike `@react-native-ads/liftoff`/`@react-native-ads/pangle`, there's no
`InterstitialAd`/`RewardedAd` class or event listeners here — just
`load`/`show`, keyed by ad type and placement ID, resolving through promises.

```ts
import UnityAds from '@react-native-ads/unity';

await UnityAds().initialize('YOUR_UNITY_GAME_ID', {testMode: true});
UnityAds().setGDPRConsent(true);
UnityAds().setCCPAConsent(true);
UnityAds().setCOPPA(false);

await UnityAds().load('interstitial', 'YOUR_PLACEMENT_ID');
const result = await UnityAds().show('interstitial', 'YOUR_PLACEMENT_ID');
// result.state: 'completed' | 'skipped'

await UnityAds().load('rewarded', 'YOUR_REWARDED_PLACEMENT_ID');
const rewardResult = await UnityAds().show(
  'rewarded',
  'YOUR_REWARDED_PLACEMENT_ID',
  {userId: 'your-user-id'}, // optional, for SSV
);
if (rewardResult.state === 'completed') {
  // grant the reward
}
```

## Notes

- `load()`/`show()` reject on failure — no separate `ERROR` event.
- `result.state === 'completed'` is also how you know a rewarded ad earned
  its reward; Unity doesn't send a distinct "reward earned" signal.
- Call `load()` again after each `show()` to prepare the next impression.
- No built-in consent UI — gather consent with
  [`@react-native-ads/ump`](../ump) (or another CMP) and forward the result
  via `setGDPRConsent`/`setCCPAConsent`/`setCOPPA`.

See [`src/specs/UnityAds.nitro.ts`](src/specs/UnityAds.nitro.ts) for the
full native interface and [`example`](example) for a runnable demo.

## License

MIT
