# @react-native-ads/ump

Google User Messaging Platform (UMP) — GDPR/CCPA consent for React Native.

[![npm version](https://img.shields.io/npm/v/@react-native-ads/ump.svg)](https://www.npmjs.com/package/@react-native-ads/ump)
[![license](https://img.shields.io/npm/l/@react-native-ads/ump.svg)](../../LICENSE)

## Features

- 🔐 Google UMP — GDPR/CCPA consent gathering and the privacy options form
- ⚡️ [Nitro Modules](https://nitro.margelo.com/) — direct JSI bindings, no bridge overhead
- 📱 iOS & Android
- 🧩 Expo config plugin included — wires up your AdMob App ID automatically
- 🔒 Fully typed API

## Installation

The UMP SDK refuses to run without a Google-issued AdMob App ID, even if you
don't use AdMob/Google Mobile Ads — omitting it throws
`The UMP SDK requires a valid application ID`. Don't have an AdMob app?
Create one for free in the [AdMob console](https://apps.admob.com/), or use
Google's public test IDs while developing — see the [`example`](example)
app for both platforms' values.

### React Native

```sh
npm install @react-native-ads/ump react-native-nitro-modules
cd ios && pod install
```

Android — add to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="YOUR_ADMOB_APP_ID" />
```

iOS — add to `Info.plist`:

```xml
<key>GADApplicationIdentifier</key>
<string>YOUR_ADMOB_APP_ID</string>
```

### Expo

```sh
npx expo install @react-native-ads/ump react-native-nitro-modules
```

Enable the bundled config plugin — it wires up the App ID on both platforms
for you:

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-ads/ump",
        {
          "androidAppId": "YOUR_ADMOB_APP_ID",
          "iosAppId": "YOUR_ADMOB_APP_ID"
        }
      ]
    ]
  }
}
```

```sh
npx expo prebuild
```

## API

### `UMPAds()`

| Method | Description |
| --- | --- |
| `requestConsentInfoUpdate(options?: UMPConsentRequestOptions): Promise<UMPConsentInfo>` | Requests/refreshes consent info from Google's servers. Call on every app launch. |
| `loadAndShowConsentFormIfRequired(): Promise<UMPConsentInfo>` | Loads and, if required, presents the consent form. No-ops if none is required. |
| `showForm(): Promise<UMPConsentInfo>` | Unconditionally loads and presents the consent form, regardless of `status`. |
| `showPrivacyOptionsForm(): Promise<UMPConsentInfo>` | Presents the "privacy options" form so the user can revisit their choice later. |
| `gatherConsent(options?: UMPConsentRequestOptions): Promise<UMPConsentInfo>` | Convenience helper: `requestConsentInfoUpdate` + `loadAndShowConsentFormIfRequired` in one call. |
| `getConsentInfo(): UMPConsentInfo` | Synchronously reads the last known consent info. |
| `reset(): void` | Clears all consent state. Testing only. |
| `getTCString(): string` | The raw [IAB TCF v2](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework) consent string, or `''` if none has been written yet. |
| `getTCModel(): TCModel` | Parses `getTCString()` into a full [`TCModel`](https://www.npmjs.com/package/@iabtcf/core). |
| `getGdprApplies(): boolean` | Whether GDPR applies to the current user. |
| `getPurposeConsents(): string` | Raw per-purpose consent bitfield (`'0'`/`'1'` per TCF purpose ID). |
| `getPurposeLegitimateInterests(): string` | Raw per-purpose legitimate-interest bitfield, same shape as `getPurposeConsents()`. |
| `getUserChoices(): UMPUserChoices` | A named, decoded view of the 10 TCF purposes + 2 special features (e.g. `selectPersonalisedAds`, `usePreciseGeolocationData`). |

### `UMPConsentRequestOptions`

| Field | Description |
| --- | --- |
| `tagForUnderAgeOfConsent?: boolean` | If `true`, the SDK skips consent gathering entirely (COPPA/child users). |
| `debugGeography?: 'disabled' \| 'EEA' \| 'notEEA'` | Simulates a region for testing. Has no effect in production builds. |
| `testDeviceIds?: string[]` | Device IDs allowed to use `debugGeography`. Required by the SDK for the debug geography to take effect on a real device. |

### `UMPConsentInfo`

| Field | Description |
| --- | --- |
| `status: 'unknown' \| 'required' \| 'notRequired' \| 'obtained'` | The current consent status. |
| `isConsentFormAvailable: boolean` | Whether a consent form is currently available to load/show. |
| `privacyOptionsRequirementStatus: 'unknown' \| 'required' \| 'notRequired'` | Whether the "privacy options" entry point is required in your UI. |
| `canRequestAds: boolean` | Whether the app is currently allowed to request ads. |

## Usage

```ts
import UMPAds from '@react-native-ads/ump';

// requestConsentInfoUpdate() + loadAndShowConsentFormIfRequired() in one call
const info = await UMPAds().gatherConsent();

if (info.canRequestAds) {
  // safe to initialize your ad SDK(s) now
}

// "Manage consent" / "Privacy options" button in your Settings screen:
if (info.privacyOptionsRequirementStatus === 'required') {
  await UMPAds().showPrivacyOptionsForm();
}

// Inspect the user's actual TCF choices, e.g. for analytics gating:
const { selectPersonalisedAds } = UMPAds().getUserChoices();
```

`gatherConsent()` is equivalent to:

```ts
await UMPAds().requestConsentInfoUpdate();
const info = await UMPAds().loadAndShowConsentFormIfRequired();
```

## Notes

- Call `requestConsentInfoUpdate()` on every app launch — Google's servers
  decide whether the user still needs to see a form.
- `canRequestAds` is the source of truth for whether it's safe to initialize
  ad SDKs (e.g. [`@react-native-ads/unity`](../unity),
  [`@react-native-ads/pangle`](../pangle)) — it can be `true` even before a
  form is shown (e.g. outside GDPR/CCPA-regulated regions).
- This package only gathers consent — it doesn't forward the result to any
  ad network. Read `canRequestAds`/`status` yourself and call the relevant
  `setGDPRConsent`/`setCCPAConsent` on each ad package you use.
- `debugGeography`/`testDeviceIds` only take effect on devices/simulators
  registered as test devices with Google — never in production.
- `getTCString`/`getPurposeConsents`/`getPurposeLegitimateInterests` read the
  standard `IABTCF_*` keys the UMP SDK writes to `UserDefaults`/
  `SharedPreferences` as an IAB-certified CMP — they reflect the last
  `requestConsentInfoUpdate()`/form interaction, not live state.
- `getTCModel()`/`getUserChoices()` decode that string via
  [`@iabtcf/core`](https://www.npmjs.com/package/@iabtcf/core) (a peer-free
  dependency of this package) and fall back to an empty/all-`false` model if
  no string has been written yet or it fails to decode.

See [`src/specs/UMPAds.nitro.ts`](src/specs/UMPAds.nitro.ts) for the full
native interface and [`example`](example) for a runnable demo.

## License

MIT
