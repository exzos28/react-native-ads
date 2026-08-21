jest.mock('expo/config-plugins', () => ({
  createRunOncePlugin: (plugin) => plugin,
  withGradleProperties: (config, action) => action(config),
  AndroidConfig: {
    BuildProperties: {
      updateAndroidBuildProperty: (modResults, key, value) => {
        modResults[key] = value;
        return modResults;
      },
    },
  },
}));

const { withPangleAds } = require('./app.plugin');

describe('withPangleAds', () => {
  it('adds the Pangle Maven repository to android/gradle.properties', () => {
    const config = { name: 'test', slug: 'test', modResults: {} };

    const result = withPangleAds(config);

    expect(result.modResults['android.extraMavenRepos']).toBe(
      JSON.stringify([
        { url: 'https://artifact.bytedance.com/repository/pangle' },
      ])
    );
  });
});
