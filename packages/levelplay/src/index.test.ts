// NitroModules.createHybridObject() is called twice: once by index.ts eagerly
// at import time, once again below to obtain a reference for assertions. Both
// calls must return the same object, hence the memoized instance.
jest.mock('react-native-nitro-modules', () => {
  let instance:
    | {
        initialize: jest.Mock;
        load: jest.Mock;
        show: jest.Mock;
        setGDPRConsent: jest.Mock;
        setCCPAConsent: jest.Mock;
        setCOPPA: jest.Mock;
      }
    | undefined;

  return {
    NitroModules: {
      createHybridObject: () => {
        instance ??= {
          initialize: jest.fn(async () => undefined),
          load: jest.fn(async () => undefined),
          show: jest.fn(async () => ({ state: 'completed' })),
          setGDPRConsent: jest.fn(),
          setCCPAConsent: jest.fn(),
          setCOPPA: jest.fn(),
        };
        return instance;
      },
    },
  };
});

import { NitroModules } from 'react-native-nitro-modules';

import { LevelPlayAds } from './index';

const mockNativeLevelPlayAds = NitroModules.createHybridObject(
  'LevelPlayAds'
) as unknown as {
  initialize: jest.Mock;
  load: jest.Mock;
  show: jest.Mock;
  setGDPRConsent: jest.Mock;
  setCCPAConsent: jest.Mock;
  setCOPPA: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LevelPlayAds().initialize', () => {
  it('throws for an empty app key', () => {
    expect(() => LevelPlayAds().initialize('')).toThrow(
      /expected a non-empty string value/
    );
  });

  it('defaults testMode to false', () => {
    LevelPlayAds().initialize('app-key-1');
    expect(mockNativeLevelPlayAds.initialize).toHaveBeenCalledWith(
      'app-key-1',
      false
    );
  });

  it('forwards testMode when provided', () => {
    LevelPlayAds().initialize('app-key-1', { testMode: true });
    expect(mockNativeLevelPlayAds.initialize).toHaveBeenCalledWith(
      'app-key-1',
      true
    );
  });
});

describe('LevelPlayAds().load', () => {
  it('throws for an empty ad unit id', () => {
    expect(() => LevelPlayAds().load('interstitial', '')).toThrow(
      /expected a non-empty string value/
    );
  });

  it('delegates to the native module', async () => {
    await LevelPlayAds().load('interstitial', 'ad-unit-1');
    expect(mockNativeLevelPlayAds.load).toHaveBeenCalledWith(
      'interstitial',
      'ad-unit-1'
    );
  });
});

describe('LevelPlayAds().show', () => {
  it('throws for an empty ad unit id', () => {
    expect(() => LevelPlayAds().show('rewarded', '')).toThrow(
      /expected a non-empty string value/
    );
  });

  it('resolves with the native show result', async () => {
    const result = await LevelPlayAds().show('rewarded', 'ad-unit-1');
    expect(mockNativeLevelPlayAds.show).toHaveBeenCalledWith(
      'rewarded',
      'ad-unit-1'
    );
    expect(result).toEqual({ state: 'completed' });
  });
});

describe('LevelPlayAds() consent setters', () => {
  it('forwards GDPR/CCPA/COPPA flags to the native module', () => {
    LevelPlayAds().setGDPRConsent(true);
    LevelPlayAds().setCCPAConsent(false);
    LevelPlayAds().setCOPPA(true);

    expect(mockNativeLevelPlayAds.setGDPRConsent).toHaveBeenCalledWith(true);
    expect(mockNativeLevelPlayAds.setCCPAConsent).toHaveBeenCalledWith(false);
    expect(mockNativeLevelPlayAds.setCOPPA).toHaveBeenCalledWith(true);
  });
});
