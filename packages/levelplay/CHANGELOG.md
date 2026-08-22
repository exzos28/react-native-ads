# @react-native-ads/levelplay

## 0.2.1

### Patch Changes

- [`933cbcd`](https://github.com/exzos28/react-native-ads/commit/933cbcdc58dd65b49e81802eb88e865fb657cd8b) Thanks [@exzos28](https://github.com/exzos28)! - Fix iOS build and runtime bugs in the LevelPlay delegate bridging:

  - `LevelPlay.initWithRequest` was renamed to `initWith` in the installed SDK version — the example app failed to build.
  - `didFailToDisplayAd`/`didClickAd`/`didCloseAd` used the wrong Swift argument label (`withAdInfo:` instead of `with:`). Since these are `@optional` protocol requirements, the wrong label didn't cause a compile error — the SDK just silently never invoked them at runtime.
  - `didRewardAd` was implemented as `didReward` (wrong method name) with the wrong argument label, so rewarded-ad callbacks were never delivered.
