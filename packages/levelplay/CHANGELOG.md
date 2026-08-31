# @react-native-ads/levelplay

## 0.2.4

### Patch Changes

- [`a86a178`](https://github.com/exzos28/react-native-ads/commit/a86a178f491dd55f29f5080fa8b601087141b860) Thanks [@exzos28](https://github.com/exzos28)! - **Fix:** `app.plugin.js` was declared in `exports` and documented in the README, but missing from `files`, so it was never included in the published tarball. Expo's config-plugin resolution fell back to `main` (an ESM build) and crashed with `SyntaxError: Unexpected token 'typeof'` instead of applying the plugin. Added `app.plugin.js` to `files` so it actually ships.

## 0.2.3

### Patch Changes

- [`777e3fb`](https://github.com/exzos28/react-native-ads/commit/777e3fb432e26b835a3270297b40a00a39fecd4e) Thanks [@exzos28](https://github.com/exzos28)! - Rename the shadowed `config` parameter in the Gradle properties mod callback to `modConfig`, fixing an eslint `no-shadow` warning in `app.plugin.js`. No behavior change.

## 0.2.2

### Patch Changes

- [`b5b6367`](https://github.com/exzos28/react-native-ads/commit/b5b636783d3d063680639b988a7902abc3531705) Thanks [@exzos28](https://github.com/exzos28)! - Fix the `exports` map to allow resolving `./app.plugin.js`, which Expo's config-plugin resolver needs — without it, `expo prebuild` failed with `PluginError: Unable to resolve a valid config plugin`.

## 0.2.1

### Patch Changes

- [`933cbcd`](https://github.com/exzos28/react-native-ads/commit/933cbcdc58dd65b49e81802eb88e865fb657cd8b) Thanks [@exzos28](https://github.com/exzos28)! - Fix iOS build and runtime bugs in the LevelPlay delegate bridging:

  - `LevelPlay.initWithRequest` was renamed to `initWith` in the installed SDK version — the example app failed to build.
  - `didFailToDisplayAd`/`didClickAd`/`didCloseAd` used the wrong Swift argument label (`withAdInfo:` instead of `with:`). Since these are `@optional` protocol requirements, the wrong label didn't cause a compile error — the SDK just silently never invoked them at runtime.
  - `didRewardAd` was implemented as `didReward` (wrong method name) with the wrong argument label, so rewarded-ad callbacks were never delivered.
