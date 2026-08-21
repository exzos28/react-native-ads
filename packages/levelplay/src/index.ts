import { NitroModules } from 'react-native-nitro-modules';

import type {
  LevelPlayAdShowResult,
  LevelPlayAdType,
  LevelPlayAds as NativeLevelPlayAds,
} from './specs/LevelPlayAds.nitro';

export interface LevelPlayAdsInitializeOptions {
  testMode?: boolean;
}

export interface LevelPlayAdsModuleInterface {
  initialize(
    appKey: string,
    options?: LevelPlayAdsInitializeOptions
  ): Promise<void>;
  load(adType: LevelPlayAdType, adUnitId: string): Promise<void>;
  show(
    adType: LevelPlayAdType,
    adUnitId: string
  ): Promise<LevelPlayAdShowResult>;
  setGDPRConsent(optIn: boolean): void;
  setCCPAConsent(optIn: boolean): void;
  setCOPPA(isCoppa: boolean): void;
}

const nativeLevelPlayAds =
  NitroModules.createHybridObject<NativeLevelPlayAds>('LevelPlayAds');

function requireAdUnitId(methodName: string, adUnitId: string): void {
  if (typeof adUnitId !== 'string' || adUnitId.length === 0) {
    throw new Error(
      `LevelPlayAds.${methodName}(*) 'adUnitId' expected a non-empty string value.`
    );
  }
}

const levelPlayAdsInstance: LevelPlayAdsModuleInterface = {
  initialize(appKey, options) {
    if (typeof appKey !== 'string' || appKey.length === 0) {
      throw new Error(
        "LevelPlayAds.initialize(*) 'appKey' expected a non-empty string value."
      );
    }
    return nativeLevelPlayAds.initialize(appKey, options?.testMode ?? false);
  },
  load(adType, adUnitId) {
    requireAdUnitId('load', adUnitId);
    return nativeLevelPlayAds.load(adType, adUnitId);
  },
  show(adType, adUnitId) {
    requireAdUnitId('show', adUnitId);
    return nativeLevelPlayAds.show(adType, adUnitId);
  },
  setGDPRConsent: (optIn) => nativeLevelPlayAds.setGDPRConsent(optIn),
  setCCPAConsent: (optIn) => nativeLevelPlayAds.setCCPAConsent(optIn),
  setCOPPA: (isCoppa) => nativeLevelPlayAds.setCOPPA(isCoppa),
};

export const LevelPlayAds = (): LevelPlayAdsModuleInterface =>
  levelPlayAdsInstance;

export default LevelPlayAds;

export type {
  LevelPlayAdShowResult,
  LevelPlayAdShowState,
  LevelPlayAdType,
  LevelPlayAds as LevelPlayAdsSpec,
} from './specs/LevelPlayAds.nitro';
