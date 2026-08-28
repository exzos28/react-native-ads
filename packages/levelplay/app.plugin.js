const {
  AndroidConfig,
  createRunOncePlugin,
  withGradleProperties,
} = require('expo/config-plugins');
const packageJson = require('./package.json');

// Verified working: android-sdk.is.com serves com.ironsource.sdk:mediationsdk
// (checked directly against the repository's maven-metadata.xml).
const LEVELPLAY_MAVEN_REPOSITORY = 'https://android-sdk.is.com/';

function withLevelPlayAds(config) {
  return withGradleProperties(config, (modConfig) => {
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      modConfig.modResults,
      'android.extraMavenRepos',
      JSON.stringify([{ url: LEVELPLAY_MAVEN_REPOSITORY }])
    );

    return modConfig;
  });
}

const plugin = createRunOncePlugin(
  withLevelPlayAds,
  packageJson.name,
  packageJson.version
);

module.exports = plugin;
module.exports.default = plugin;
module.exports.withLevelPlayAds = withLevelPlayAds;
