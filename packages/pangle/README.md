# @react-native-ads/pangle

[Nitro Modules](https://nitro.margelo.com/) bridge for Pangle interstitial
and rewarded ads.

## Install

```sh
npm install @react-native-ads/pangle react-native-nitro-modules
```

Pangle's Android SDK lives outside Google's default Maven repos. With Expo
CNG, enable the bundled config plugin:

```json
{
  "expo": {
    "plugins": ["@react-native-ads/pangle"]
  }
}
```

Without CNG, add the repo to your app's `android/build.gradle` yourself:

```groovy
allprojects {
  repositories {
    maven { url "https://artifact.bytedance.com/repository/pangle" }
  }
}
```

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
rewarded.load({userId: 'your-user-id'}); // optional, for SSV
```

## Notes

- Ad instances are meant to be reused — call `load()` again on the same
  `InterstitialAd`/`RewardedAd` after `CLOSED` instead of creating a new one.
- No `AdEventType.PAID` event (unlike Liftoff/Google Mobile Ads).
- Pangle doesn't report reward type/amount, so `LOADED`/`EARNED_REWARD`
  payloads are always `undefined` — treat them as signals only.
- Use `RewardedAdEventType.LOADED`, not `AdEventType.LOADED`, on a
  `RewardedAd`.
- No built-in consent UI (no UMP equivalent) — plug your own and forward the
  result via `setGDPRConsent`/`setCCPAConsent`/`setCOPPA`.

See [`src/specs/PangleAds.nitro.ts`](src/specs/PangleAds.nitro.ts) for the
full native interface and [`example`](example) for a runnable demo.

## License

MIT
