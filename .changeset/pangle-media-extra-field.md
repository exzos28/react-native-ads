---
"@react-native-ads/pangle": minor
---

**Breaking:** `PangleAdVerificationOptions` no longer has `userId`/`customData`. The Pangle SDK only reads a single `media_extra` key from `PAGRewardedRequest.extraInfo` (confirmed with Pangle support) — any other key, including a literal `userId`/`customData`, is silently ignored and the S2S callback's `user_id` stays `"defaultUser"`. `PAGConfig.setUserData`/`userDataString` has no effect on the SSV callback either.

The option is now a single `mediaExtra?: string` field forwarded to the native SDK verbatim as `media_extra` — callers decide what value to put there (e.g. a user id), instead of the library guessing a priority between two unrelated fields.

```diff
- ad.load({ userId: myUserId })
+ ad.load({ mediaExtra: myUserId })
```
