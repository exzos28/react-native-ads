import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import UnityAds from '@react-native-ads/unity';

// Unity's public test game IDs, see https://docs.unity.com/ads/en-us/manual/InitializingSDK
const UNITY_GAME_ID = Platform.select({
  ios: '4374880',
  default: '4374881',
});
const INTERSTITIAL_PLACEMENT_ID = 'Interstitial_' + Platform.OS;
const REWARDED_PLACEMENT_ID = 'Rewarded_' + Platform.OS;

export default function App() {
  const [status, setStatus] = useState('Initializing…');
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  const loadInterstitial = useCallback(() => {
    setInterstitialLoaded(false);
    UnityAds()
      .load('interstitial', INTERSTITIAL_PLACEMENT_ID)
      .then(() => setInterstitialLoaded(true))
      .catch((error) =>
        setStatus(`Failed to load interstitial: ${error.message}`)
      );
  }, []);

  const loadRewarded = useCallback(() => {
    setRewardedLoaded(false);
    UnityAds()
      .load('rewarded', REWARDED_PLACEMENT_ID)
      .then(() => setRewardedLoaded(true))
      .catch((error) =>
        setStatus(`Failed to load rewarded ad: ${error.message}`)
      );
  }, []);

  useEffect(() => {
    UnityAds()
      .initialize(UNITY_GAME_ID, { testMode: true })
      .then(() => {
        setStatus('Ready');
        loadInterstitial();
        loadRewarded();
      })
      .catch((error) => setStatus(`Failed to initialize: ${error.message}`));
  }, [loadInterstitial, loadRewarded]);

  const showInterstitial = useCallback(() => {
    UnityAds()
      .show('interstitial', INTERSTITIAL_PLACEMENT_ID)
      .then((result) => setStatus(`Interstitial ${result.state}`))
      .catch((error) =>
        setStatus(`Failed to show interstitial: ${error.message}`)
      )
      .finally(loadInterstitial);
  }, [loadInterstitial]);

  const showRewarded = useCallback(() => {
    UnityAds()
      .show('rewarded', REWARDED_PLACEMENT_ID, { userId: 'example-user' })
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
