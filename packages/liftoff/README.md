# @react-native-ads/liftoff

[Nitro Modules](https://nitro.margelo.com/) bridge for Liftoff Monetize
(Vungle) interstitial and rewarded ads.

## Install

```sh
npm install @react-native-ads/liftoff react-native-nitro-modules
```

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
- No built-in consent UI (no UMP equivalent) — plug your own and forward the
  result via `setGDPRConsent`/`setCCPAConsent`/`setCOPPA`.

See [`src/specs/LiftoffAds.nitro.ts`](src/specs/LiftoffAds.nitro.ts) for the
full native interface and [`example`](example) for a runnable demo.

## License

MIT
