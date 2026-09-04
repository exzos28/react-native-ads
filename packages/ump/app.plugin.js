const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} = require('expo/config-plugins');
const packageJson = require('./package.json');

// The UMP SDK refuses to run without a Google-issued AdMob App ID, even if
// the app doesn't use AdMob/Google Mobile Ads — see the package README.

function withUMPAndroidAppId(config, androidAppId) {
  return withAndroidManifest(config, (modConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      modConfig.modResults
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'com.google.android.gms.ads.APPLICATION_ID',
      androidAppId
    );
    return modConfig;
  });
}

function withUMPIosAppId(config, iosAppId) {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults.GADApplicationIdentifier = iosAppId;
    return modConfig;
  });
}

function withUMPAds(config, { androidAppId, iosAppId } = {}) {
  if (!androidAppId || !iosAppId) {
    throw new Error(
      "@react-native-ads/ump config plugin requires both 'androidAppId' and " +
        "'iosAppId' — the UMP SDK requires a Google-issued AdMob App ID to " +
        'run. Pass them in app.json/app.config, e.g.:\n' +
        '["@react-native-ads/ump", { "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX", "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" }]'
    );
  }

  config = withUMPAndroidAppId(config, androidAppId);
  config = withUMPIosAppId(config, iosAppId);
  return config;
}

const plugin = createRunOncePlugin(
  withUMPAds,
  packageJson.name,
  packageJson.version
);

module.exports = plugin;
module.exports.default = plugin;
module.exports.withUMPAds = withUMPAds;
