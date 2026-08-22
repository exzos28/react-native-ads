import { useCallback, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import UnityAds from '@react-native-ads/unity';
import MobileAdsPangle from '@react-native-ads/pangle';
import MobileAdsLiftoff from '@react-native-ads/liftoff';
import LevelPlayAds from '@react-native-ads/levelplay';

// Showcases that all four @react-native-ads/* packages install, link, and
// initialize side by side in a single (Expo dev-client) app. See each
// package's own `example` app for a full load/show demo of that SDK.
export default function App() {
  const [status, setStatus] = useState('Idle');

  const initializeAll = useCallback(async () => {
    setStatus('Initializing…');
    try {
      await Promise.all([
        UnityAds().initialize('YOUR_UNITY_GAME_ID', { testMode: true }),
        MobileAdsPangle().initialize('YOUR_PANGLE_APP_ID'),
        MobileAdsLiftoff().initialize('YOUR_LIFTOFF_APP_ID'),
        LevelPlayAds().initialize('YOUR_LEVELPLAY_APP_KEY', { testMode: true }),
      ]);
      setStatus('All four SDKs initialized');
    } catch (error) {
      setStatus(`Failed: ${(error as Error).message}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>@react-native-ads monorepo demo</Text>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.buttons}>
        <Button title="Initialize all networks" onPress={initializeAll} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  status: {
    textAlign: 'center',
  },
  buttons: {
    marginTop: 16,
  },
});
