import { useCallback, useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  AdEventType,
  InterstitialAd,
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
} from '@react-native-ads/pangle';

// Pangle's public test placement IDs, see https://www.pangleglobal.com/integration/test-mode
const INTERSTITIAL_AD_UNIT_ID = '1091197';
const REWARDED_AD_UNIT_ID = '1091202';
const PANGLE_APP_ID = 'YOUR_PANGLE_APP_ID';

const interstitialAd = InterstitialAd.createForAdRequest(
  INTERSTITIAL_AD_UNIT_ID
);
const rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);

export default function App() {
  const [status, setStatus] = useState('Initializing…');
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  useEffect(() => {
    MobileAds()
      .initialize(PANGLE_APP_ID)
      .then((adapterStatuses) =>
        setStatus(adapterStatuses[0]?.description ?? 'Ready')
      )
      .catch((error) => setStatus(`Failed to initialize: ${error.message}`));

    const unsubscribeInterstitial = interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => setInterstitialLoaded(true)
    );
    const unsubscribeRewarded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setRewardedLoaded(true)
    );

    interstitialAd.load();
    rewardedAd.load();

    return () => {
      unsubscribeInterstitial();
      unsubscribeRewarded();
    };
  }, []);

  const showInterstitial = useCallback(() => {
    interstitialAd
      .show()
      .catch((error) =>
        setStatus(`Failed to show interstitial: ${error.message}`)
      )
      .finally(() => {
        setInterstitialLoaded(false);
        interstitialAd.load();
      });
  }, []);

  const showRewarded = useCallback(() => {
    rewardedAd
      .show()
      .catch((error) =>
        setStatus(`Failed to show rewarded ad: ${error.message}`)
      )
      .finally(() => {
        setRewardedLoaded(false);
        rewardedAd.load();
      });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.buttons}>
        <Button
          title={
            interstitialLoaded ? 'Show interstitial' : 'Loading interstitial…'
          }
          disabled={!interstitialLoaded}
          onPress={showInterstitial}
        />
        <Button
          title={rewardedLoaded ? 'Show rewarded ad' : 'Loading rewarded ad…'}
          disabled={!rewardedLoaded}
          onPress={showRewarded}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  status: {
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  buttons: {
    gap: 12,
  },
});
