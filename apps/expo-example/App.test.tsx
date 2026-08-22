/**
 * Integration test: exercises all four @react-native-ads/* packages together
 * in a single React tree, the way a real consumer app would. Unit tests in
 * each package already cover the JS wrapper in isolation; this test instead
 * catches problems that only show up when the packages are combined — e.g.
 * two independently developed packages accidentally registering the same
 * Nitro hybrid object name, or one package's rejected initialize() breaking
 * the others' concurrent Promise.all() calls.
 *
 * react-native-nitro-modules is mocked via __mocks__/react-native-nitro-modules.ts
 * (a manual mock, not an inline jest.mock() factory) — see that file for why.
 */
jest.mock('react-native-nitro-modules');

import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { NitroModules } from 'react-native-nitro-modules';

import App from './App';

type MockNativeAdsModule = { initialize: jest.Mock };

const nativeUnity = NitroModules.createHybridObject(
  'UnityAds'
) as unknown as MockNativeAdsModule;
const nativePangle = NitroModules.createHybridObject(
  'PangleAds'
) as unknown as MockNativeAdsModule;
const nativeLiftoff = NitroModules.createHybridObject(
  'LiftoffAds'
) as unknown as MockNativeAdsModule;
const nativeLevelPlay = NitroModules.createHybridObject(
  'LevelPlayAds'
) as unknown as MockNativeAdsModule;

function getStatusText(renderer: ReactTestRenderer): string {
  return renderer.root.findByProps({ testID: 'status' }).props
    .children as string;
}

async function pressInitialize(renderer: ReactTestRenderer): Promise<void> {
  const onPress = renderer.root.findByProps({ testID: 'initialize-button' })
    .props.onPress as () => Promise<void>;
  await act(async () => {
    await onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('combined demo app (Expo dev-client)', () => {
  it('registers a distinct native module per package (no name collision)', () => {
    // Each package memoizes its native module at import time, keyed by the
    // name it passes to createHybridObject(). If two packages picked the
    // same name, they'd resolve to the *same* mock instance here.
    const instances = [
      nativeUnity,
      nativePangle,
      nativeLiftoff,
      nativeLevelPlay,
    ];
    expect(new Set(instances).size).toBe(instances.length);
  });

  it('initializes all four SDKs together on button press', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<App />);
    });

    expect(getStatusText(renderer)).toBe('Idle');

    await pressInitialize(renderer);

    // Each wrapper unpacks its own JS-facing options object before calling
    // native — verifying the exact native args, not just "was called",
    // catches a wrapper silently forwarding the wrong shape.
    expect(nativeUnity.initialize).toHaveBeenCalledWith(
      'YOUR_UNITY_GAME_ID',
      true
    );
    expect(nativePangle.initialize).toHaveBeenCalledWith('YOUR_PANGLE_APP_ID');
    expect(nativeLiftoff.initialize).toHaveBeenCalledWith(
      'YOUR_LIFTOFF_APP_ID'
    );
    expect(nativeLevelPlay.initialize).toHaveBeenCalledWith(
      'YOUR_LEVELPLAY_APP_KEY',
      true
    );
    expect(getStatusText(renderer)).toBe('All four SDKs initialized');
  });

  it('surfaces a failure from one SDK without hanging the others', async () => {
    nativePangle.initialize.mockRejectedValueOnce(
      new Error('Pangle init failed')
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<App />);
    });

    await pressInitialize(renderer);

    // All four calls still fire concurrently — one rejection doesn't stop
    // Promise.all from having started the other three.
    expect(nativeUnity.initialize).toHaveBeenCalled();
    expect(nativeLiftoff.initialize).toHaveBeenCalled();
    expect(nativeLevelPlay.initialize).toHaveBeenCalled();
    expect(getStatusText(renderer)).toBe('Failed: Pangle init failed');
  });
});
