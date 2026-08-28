---
"@react-native-ads/pangle": patch
---

Remove the unspecified `userId`-falls-back-to-`customData` behavior added in 0.2.1. Pangle has room for a single opaque value in `media_extra`, and `userId`/`customData` are distinct, unrelated fields — silently picking one when both are present was an invented priority, not something confirmed by Pangle support. Only `userId` is forwarded now; `customData` is not supported for this provider (same as Liftoff).
