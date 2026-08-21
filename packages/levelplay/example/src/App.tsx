import { useCallback, useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import LevelPlayAds from '@react-native-ads/levelplay';

// See https://developers.is.com/ironsource-mobile/android/levelplay-quick-start/
// for how to obtain an app key and test placement/ad unit IDs for your account.
const LEVELPLAY_APP_KEY = 'YOUR_LEVELPLAY_APP_KEY';
const INTERSTITIAL_AD_UNIT_ID = 'YOUR_INTERSTITIAL_AD_UNIT_ID';
const REWARDED_AD_UNIT_ID = 'YOUR_REWARDED_AD_UNIT_ID';

export default function App() {
  const [status, setStatus] = useState('Initializing…');
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  const loadInterstitial = useCallback(() => {
    setInterstitialLoaded(false);
    LevelPlayAds()
      .load('interstitial', INTERSTITIAL_AD_UNIT_ID)
      .then(() => setInterstitialLoaded(true))
      .catch((error) =>
        setStatus(`Failed to load interstitial: ${error.message}`)
      );
  }, []);

  const loadRewarded = useCallback(() => {
    setRewardedLoaded(false);
    LevelPlayAds()
      .load('rewarded', REWARDED_AD_UNIT_ID)
      .then(() => setRewardedLoaded(true))
      .catch((error) =>
        setStatus(`Failed to load rewarded ad: ${error.message}`)
      );
  }, []);

  useEffect(() => {
    LevelPlayAds()
      .initialize(LEVELPLAY_APP_KEY, { testMode: true })
      .then(() => {
        setStatus('Ready');
        loadInterstitial();
        loadRewarded();
      })
      .catch((error) => setStatus(`Failed to initialize: ${error.message}`));
  }, [loadInterstitial, loadRewarded]);

  const showInterstitial = useCallback(() => {
    LevelPlayAds()
      .show('interstitial', INTERSTITIAL_AD_UNIT_ID)
      .then((result) => setStatus(`Interstitial ${result.state}`))
      .catch((error) =>
        setStatus(`Failed to show interstitial: ${error.message}`)
      )
      .finally(loadInterstitial);
  }, [loadInterstitial]);

  const showRewarded = useCallback(() => {
    LevelPlayAds()
      .show('rewarded', REWARDED_AD_UNIT_ID)
      .then((result) => setStatus(`Rewarded ad ${result.state}`))
      .catch((error) =>
        setStatus(`Failed to show rewarded ad: ${error.message}`)
      )
      .finally(loadRewarded);
  }, [loadRewarded]);

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
