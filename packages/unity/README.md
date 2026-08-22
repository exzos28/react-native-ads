# @react-native-ads/unity

[Nitro Modules](https://nitro.margelo.com/) bridge for Unity Ads
interstitial and rewarded ads.

## Install

```sh
npm install @react-native-ads/unity react-native-nitro-modules
```

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

See [`src/specs/UnityAds.nitro.ts`](src/specs/UnityAds.nitro.ts) for the
full native interface and [`example`](example) for a runnable demo.

## License

MIT

