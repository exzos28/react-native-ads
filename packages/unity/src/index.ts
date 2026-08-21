import { NitroModules } from 'react-native-nitro-modules';

import type {
  UnityAdShowResult,
  UnityAdType,
  UnityAdVerificationOptions,
  UnityAds as NativeUnityAds,
} from './specs/UnityAds.nitro';

export interface UnityAdsInitializeOptions {
  testMode?: boolean;
}

export interface UnityAdsModuleInterface {
  initialize(
    gameId: string,
    options?: UnityAdsInitializeOptions
  ): Promise<void>;
  load(adType: UnityAdType, placementId: string): Promise<void>;
  show(
    adType: UnityAdType,
    placementId: string,
    verification?: UnityAdVerificationOptions
  ): Promise<UnityAdShowResult>;
  setGDPRConsent(optIn: boolean): void;
  setCCPAConsent(optIn: boolean): void;
  setCOPPA(isCoppa: boolean): void;
}

const nativeUnityAds =
  NitroModules.createHybridObject<NativeUnityAds>('UnityAds');

function requirePlacementId(methodName: string, placementId: string): void {
  if (typeof placementId !== 'string' || placementId.length === 0) {
    throw new Error(
      `UnityAds.${methodName}(*) 'placementId' expected a non-empty string value.`
    );
  }
}

const unityAdsInstance: UnityAdsModuleInterface = {
  initialize(gameId, options) {
    if (typeof gameId !== 'string' || gameId.length === 0) {
      throw new Error(
        "UnityAds.initialize(*) 'gameId' expected a non-empty string value."
      );
    }
    return nativeUnityAds.initialize(gameId, options?.testMode ?? false);
  },
  load(adType, placementId) {
    requirePlacementId('load', placementId);
    return nativeUnityAds.load(adType, placementId);
  },
  show(adType, placementId, verification) {
    requirePlacementId('show', placementId);
    return nativeUnityAds.show(adType, placementId, verification);
  },
  setGDPRConsent: (optIn) => nativeUnityAds.setGDPRConsent(optIn),
  setCCPAConsent: (optIn) => nativeUnityAds.setCCPAConsent(optIn),
  setCOPPA: (isCoppa) => nativeUnityAds.setCOPPA(isCoppa),
};

export const UnityAds = (): UnityAdsModuleInterface => unityAdsInstance;

export default UnityAds;

export type {
  UnityAdShowResult,
  UnityAdShowState,
  UnityAdType,
  UnityAdVerificationOptions,
  UnityAds as UnityAdsSpec,
} from './specs/UnityAds.nitro';
