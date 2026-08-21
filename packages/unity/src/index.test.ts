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

import { UnityAds } from './index';

const mockNativeUnityAds = NitroModules.createHybridObject(
  'UnityAds'
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

describe('UnityAds().initialize', () => {
  it('throws for an empty game id', () => {
    expect(() => UnityAds().initialize('')).toThrow(
      /expected a non-empty string value/
    );
  });

  it('defaults testMode to false', () => {
    UnityAds().initialize('game-1');
    expect(mockNativeUnityAds.initialize).toHaveBeenCalledWith('game-1', false);
  });

  it('forwards testMode when provided', () => {
    UnityAds().initialize('game-1', { testMode: true });
    expect(mockNativeUnityAds.initialize).toHaveBeenCalledWith('game-1', true);
  });
});

describe('UnityAds().load', () => {
  it('throws for an empty placement id', () => {
    expect(() => UnityAds().load('interstitial', '')).toThrow(
      /expected a non-empty string value/
    );
  });

  it('delegates to the native module', async () => {
    await UnityAds().load('interstitial', 'placement-1');
    expect(mockNativeUnityAds.load).toHaveBeenCalledWith(
      'interstitial',
      'placement-1'
    );
  });
});

describe('UnityAds().show', () => {
  it('throws for an empty placement id', () => {
    expect(() => UnityAds().show('rewarded', '')).toThrow(
      /expected a non-empty string value/
    );
  });

  it('resolves with the native show result', async () => {
    const result = await UnityAds().show('rewarded', 'placement-1');
    expect(mockNativeUnityAds.show).toHaveBeenCalledWith(
      'rewarded',
      'placement-1',
      undefined
    );
    expect(result).toEqual({ state: 'completed' });
  });

  it('forwards verification options to the native module', async () => {
    await UnityAds().show('rewarded', 'placement-1', {
      userId: 'user-1',
      customData: 'custom-1',
    });
    expect(mockNativeUnityAds.show).toHaveBeenCalledWith(
      'rewarded',
      'placement-1',
      { userId: 'user-1', customData: 'custom-1' }
    );
  });
});

describe('UnityAds() consent setters', () => {
  it('forwards GDPR/CCPA/COPPA flags to the native module', () => {
    UnityAds().setGDPRConsent(true);
    UnityAds().setCCPAConsent(false);
    UnityAds().setCOPPA(true);

    expect(mockNativeUnityAds.setGDPRConsent).toHaveBeenCalledWith(true);
    expect(mockNativeUnityAds.setCCPAConsent).toHaveBeenCalledWith(false);
    expect(mockNativeUnityAds.setCOPPA).toHaveBeenCalledWith(true);
  });
});
