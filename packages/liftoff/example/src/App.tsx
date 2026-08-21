import { useCallback, useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  AdEventType,
  InterstitialAd,
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
} from '@react-native-ads/liftoff';

const INTERSTITIAL_PLACEMENT_ID = 'YOUR_INTERSTITIAL_PLACEMENT_ID';
const REWARDED_PLACEMENT_ID = 'YOUR_REWARDED_PLACEMENT_ID';
const LIFTOFF_APP_ID = 'YOUR_LIFTOFF_APP_ID';

const interstitialAd = InterstitialAd.createForAdRequest(
  INTERSTITIAL_PLACEMENT_ID
);
const rewardedAd = RewardedAd.createForAdRequest(REWARDED_PLACEMENT_ID);

export default function App() {
  const [status, setStatus] = useState('Initializing…');
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  useEffect(() => {
    MobileAds()
      .initialize(LIFTOFF_APP_ID)
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
      .show({ immersiveModeEnabled: true })
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
      .show({ immersiveModeEnabled: true })
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
