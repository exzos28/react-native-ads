const {
  AndroidConfig,
  createRunOncePlugin,
  withGradleProperties,
} = require('expo/config-plugins');
const packageJson = require('./package.json');

const PANGLE_MAVEN_REPOSITORY =
  'https://artifact.bytedance.com/repository/pangle';

function withPangleAds(config) {
  return withGradleProperties(config, (modConfig) => {
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      modConfig.modResults,
      'android.extraMavenRepos',
      JSON.stringify([{ url: PANGLE_MAVEN_REPOSITORY }])
    );

    return modConfig;
  });
}

const plugin = createRunOncePlugin(
  withPangleAds,
  packageJson.name,
  packageJson.version
);

module.exports = plugin;
module.exports.default = plugin;
module.exports.withPangleAds = withPangleAds;
