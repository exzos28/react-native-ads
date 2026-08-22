---
"@react-native-ads/levelplay": patch
---

Fix iOS build and runtime bugs in the LevelPlay delegate bridging:

- `LevelPlay.initWithRequest` was renamed to `initWith` in the installed SDK version — the example app failed to build.
- `didFailToDisplayAd`/`didClickAd`/`didCloseAd` used the wrong Swift argument label (`withAdInfo:` instead of `with:`). Since these are `@optional` protocol requirements, the wrong label didn't cause a compile error — the SDK just silently never invoked them at runtime.
- `didRewardAd` was implemented as `didReward` (wrong method name) with the wrong argument label, so rewarded-ad callbacks were never delivered.
