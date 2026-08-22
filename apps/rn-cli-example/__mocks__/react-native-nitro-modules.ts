// Manual mock, adjacent to node_modules, so it's picked up regardless of
// which physical copy of react-native-nitro-modules a given package resolves
// to (packages/* resolve the hoisted root copy, this app's own source
// resolves its locally-hoisted copy — installConfig.hoistingLimits keeps
// them separate). A jest.mock() call inside a single test file only mocks
// the copy resolved from that file's own location.
type MockNativeAdsModule = {
  initialize: jest.Mock;
  setGDPRConsent: jest.Mock;
  setCCPAConsent: jest.Mock;
  setCOPPA: jest.Mock;
};

const instances: Record<string, MockNativeAdsModule> = {};

function createHybridObject(name: string): MockNativeAdsModule {
  instances[name] ??= {
    initialize: jest.fn(async () => undefined),
    setGDPRConsent: jest.fn(),
    setCCPAConsent: jest.fn(),
    setCOPPA: jest.fn(),
  };
  return instances[name];
}

export const NitroModules = {
  createHybridObject: jest.fn(createHybridObject),
};
