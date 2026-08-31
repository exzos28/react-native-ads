---
"@react-native-ads/pangle": patch
"@react-native-ads/levelplay": patch
---

**Fix:** `app.plugin.js` was declared in `exports` and documented in the README, but missing from `files`, so it was never included in the published tarball. Expo's config-plugin resolution fell back to `main` (an ESM build) and crashed with `SyntaxError: Unexpected token 'typeof'` instead of applying the plugin. Added `app.plugin.js` to `files` so it actually ships.
