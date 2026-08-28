# @react-native-ads/pangle

## 0.2.1

### Patch Changes

- [`b5b6367`](https://github.com/exzos28/react-native-ads/commit/b5b636783d3d063680639b988a7902abc3531705) Thanks [@exzos28](https://github.com/exzos28)! - Fix Pangle rewarded ad SSV verification: the Pangle SDK only reads the `media_extra` key from `PAGRewardedRequest.extraInfo` (confirmed with Pangle support) — the previous `userId`/`customData` keys and the `PAGConfig.setUserData`/`userDataString` call were silently ignored, so the SSV callback's `user_id` always stayed `"defaultUser"`. `userId` (falling back to `customData`) is now sent as `media_extra`.

  Also fix both packages' `exports` map to allow resolving `./app.plugin.js`, which Expo's config-plugin resolver needs — without it, `expo prebuild` failed with `PluginError: Unable to resolve a valid config plugin`.
