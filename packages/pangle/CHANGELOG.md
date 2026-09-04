# @react-native-ads/pangle

## 0.3.2

### Patch Changes

- [#6](https://github.com/exzos28/react-native-ads/pull/6) [`0466020`](https://github.com/exzos28/react-native-ads/commit/046602066384907f6fde933317223a004cf87675) Thanks [@exzos28](https://github.com/exzos28)! - README: point to [`@react-native-ads/ump`](https://www.npmjs.com/package/@react-native-ads/ump) for consent instead of `react-native-google-mobile-ads` ([#6](https://github.com/exzos28/react-native-ads/issues/6)).

## 0.3.1

### Patch Changes

- [`a86a178`](https://github.com/exzos28/react-native-ads/commit/a86a178f491dd55f29f5080fa8b601087141b860) Thanks [@exzos28](https://github.com/exzos28)! - **Fix:** `app.plugin.js` was declared in `exports` and documented in the README, but missing from `files`, so it was never included in the published tarball. Expo's config-plugin resolution fell back to `main` (an ESM build) and crashed with `SyntaxError: Unexpected token 'typeof'` instead of applying the plugin. Added `app.plugin.js` to `files` so it actually ships.

## 0.3.0

### Minor Changes

- [`c202106`](https://github.com/exzos28/react-native-ads/commit/c202106cfae8fb44ad9216f0cc1e25cd282b4592) Thanks [@exzos28](https://github.com/exzos28)! - **Breaking:** `PangleAdVerificationOptions` no longer has `userId`/`customData`. The Pangle SDK only reads a single `media_extra` key from `PAGRewardedRequest.extraInfo` (confirmed with Pangle support) — any other key, including a literal `userId`/`customData`, is silently ignored and the S2S callback's `user_id` stays `"defaultUser"`. `PAGConfig.setUserData`/`userDataString` has no effect on the SSV callback either.

  The option is now a single `mediaExtra?: string` field forwarded to the native SDK verbatim as `media_extra` — callers decide what value to put there (e.g. a user id), instead of the library guessing a priority between two unrelated fields.

  ```diff
  - ad.load({ userId: myUserId })
  + ad.load({ mediaExtra: myUserId })
  ```

### Patch Changes

- [`777e3fb`](https://github.com/exzos28/react-native-ads/commit/777e3fb432e26b835a3270297b40a00a39fecd4e) Thanks [@exzos28](https://github.com/exzos28)! - Rename the shadowed `config` parameter in the Gradle properties mod callback to `modConfig`, fixing an eslint `no-shadow` warning in `app.plugin.js`. No behavior change.

## 0.2.1

### Patch Changes

- [`b5b6367`](https://github.com/exzos28/react-native-ads/commit/b5b636783d3d063680639b988a7902abc3531705) Thanks [@exzos28](https://github.com/exzos28)! - Fix Pangle rewarded ad SSV verification: the Pangle SDK only reads the `media_extra` key from `PAGRewardedRequest.extraInfo` (confirmed with Pangle support) — the previous `userId`/`customData` keys and the `PAGConfig.setUserData`/`userDataString` call were silently ignored, so the SSV callback's `user_id` always stayed `"defaultUser"`. `userId` (falling back to `customData`) is now sent as `media_extra`.

  Also fix both packages' `exports` map to allow resolving `./app.plugin.js`, which Expo's config-plugin resolver needs — without it, `expo prebuild` failed with `PluginError: Unable to resolve a valid config plugin`.
