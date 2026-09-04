jest.mock('react-native-nitro-modules', () => {
  const defaultConsentInfo = {
    status: 'obtained',
    isConsentFormAvailable: false,
    privacyOptionsRequirementStatus: 'notRequired',
    canRequestAds: true,
  };

  const mockNativeUMPAds = {
    requestConsentInfoUpdate: jest.fn(async () => defaultConsentInfo),
    loadAndShowConsentFormIfRequired: jest.fn(async () => defaultConsentInfo),
    showPrivacyOptionsForm: jest.fn(async () => defaultConsentInfo),
    showForm: jest.fn(async () => defaultConsentInfo),
    getConsentInfo: jest.fn(() => defaultConsentInfo),
    reset: jest.fn(),
    getTCString: jest.fn(() => ''),
    getGdprApplies: jest.fn(() => true),
    getPurposeConsents: jest.fn(() => ''),
    getPurposeLegitimateInterests: jest.fn(() => ''),
  };

  return {
    NitroModules: {
      createHybridObject: () => mockNativeUMPAds,
    },
  };
});

import { NitroModules } from 'react-native-nitro-modules';
import { UMPAds } from './index';

const mockNativeUMPAds = NitroModules.createHybridObject(
  'UMPAds' as never
) as unknown as Record<string, jest.Mock>;

const defaultConsentInfo = {
  status: 'obtained',
  isConsentFormAvailable: false,
  privacyOptionsRequirementStatus: 'notRequired',
  canRequestAds: true,
};

beforeEach(() => {
  Object.values(mockNativeUMPAds).forEach((mockFn) => mockFn.mockClear());
});

describe('UMPAds()', () => {
  it('forwards requestConsentInfoUpdate options to the native module', async () => {
    const options = {
      tagForUnderAgeOfConsent: true,
      debugGeography: 'EEA' as const,
      testDeviceIds: ['device-1'],
    };

    const info = await UMPAds().requestConsentInfoUpdate(options);

    expect(mockNativeUMPAds.requestConsentInfoUpdate).toHaveBeenCalledWith(
      options
    );
    expect(info).toEqual(defaultConsentInfo);
  });

  it('delegates loadAndShowConsentFormIfRequired to the native module', async () => {
    await UMPAds().loadAndShowConsentFormIfRequired();
    expect(
      mockNativeUMPAds.loadAndShowConsentFormIfRequired
    ).toHaveBeenCalledTimes(1);
  });

  it('delegates showPrivacyOptionsForm to the native module', async () => {
    await UMPAds().showPrivacyOptionsForm();
    expect(mockNativeUMPAds.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  });

  it('delegates getConsentInfo to the native module', () => {
    const info = UMPAds().getConsentInfo();
    expect(mockNativeUMPAds.getConsentInfo).toHaveBeenCalledTimes(1);
    expect(info).toEqual(defaultConsentInfo);
  });

  it('delegates reset to the native module', () => {
    UMPAds().reset();
    expect(mockNativeUMPAds.reset).toHaveBeenCalledTimes(1);
  });

  it('delegates showForm to the native module', async () => {
    await UMPAds().showForm();
    expect(mockNativeUMPAds.showForm).toHaveBeenCalledTimes(1);
  });

  it('gatherConsent calls requestConsentInfoUpdate then loadAndShowConsentFormIfRequired', async () => {
    const options = { tagForUnderAgeOfConsent: true };

    await UMPAds().gatherConsent(options);

    expect(mockNativeUMPAds.requestConsentInfoUpdate).toHaveBeenCalledWith(
      options
    );
    expect(
      mockNativeUMPAds.loadAndShowConsentFormIfRequired
    ).toHaveBeenCalledTimes(1);
  });

  it('delegates getGdprApplies to the native module', () => {
    expect(UMPAds().getGdprApplies()).toBe(true);
    expect(mockNativeUMPAds.getGdprApplies).toHaveBeenCalledTimes(1);
  });

  it('getTCModel falls back to an empty TCModel when there is no TC string', () => {
    const tcModel = UMPAds().getTCModel();
    expect(tcModel.purposeConsents.has(1)).toBe(false);
  });

  it('getUserChoices reports every choice as false when there is no TC string', () => {
    expect(UMPAds().getUserChoices()).toEqual({
      storeAndAccessInformationOnDevice: false,
      selectBasicAds: false,
      createAPersonalisedAdsProfile: false,
      selectPersonalisedAds: false,
      createAPersonalisedContentProfile: false,
      selectPersonalisedContent: false,
      measureAdPerformance: false,
      measureContentPerformance: false,
      applyMarketResearchToGenerateAudienceInsights: false,
      developAndImproveProducts: false,
      usePreciseGeolocationData: false,
      activelyScanDeviceCharacteristicsForIdentification: false,
    });
  });

  it('getUserChoices falls back to all-false on an undecodable TC string', () => {
    mockNativeUMPAds.getTCString!.mockReturnValueOnce('not-a-real-tc-string');
    expect(UMPAds().getUserChoices().storeAndAccessInformationOnDevice).toBe(
      false
    );
  });
});
