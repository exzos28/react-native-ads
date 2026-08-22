# @react-native-ads/levelplay

[Nitro Modules](https://nitro.margelo.com/) bridge for the LevelPlay
(ironSource) mediation SDK — interstitial and rewarded ads.

## Install

```sh
npm install @react-native-ads/levelplay react-native-nitro-modules
```

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
