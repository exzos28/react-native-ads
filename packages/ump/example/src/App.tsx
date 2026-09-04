import { useCallback, useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import UMPAds, {
  type UMPConsentInfo,
  type UMPUserChoices,
} from '@react-native-ads/ump';

export default function App() {
  const [status, setStatus] = useState('Requesting consent info…');
  const [consentInfo, setConsentInfo] = useState<UMPConsentInfo | null>(null);
  const [userChoices, setUserChoices] = useState<UMPUserChoices | null>(null);

  const gatherConsent = useCallback(async () => {
    try {
      const info = await UMPAds().gatherConsent({
        // testDeviceIds: ['YOUR_TEST_DEVICE_ID'],
        // debugGeography: 'EEA',
      });

      setConsentInfo(info);
      setStatus(info.canRequestAds ? 'Ready to request ads' : 'Not ready');
    } catch (error) {
      setStatus(`Failed to gather consent: ${(error as Error).message}`);
    }
  }, []);

  useEffect(() => {
    gatherConsent();
  }, [gatherConsent]);

  const showForm = useCallback(() => {
    UMPAds()
      .showForm()
      .then(setConsentInfo)
      .catch((error) => setStatus(`Failed to show form: ${error.message}`));
  }, []);

  const showPrivacyOptions = useCallback(() => {
    UMPAds()
      .showPrivacyOptionsForm()
      .then(setConsentInfo)
      .catch((error) =>
        setStatus(`Failed to show privacy options: ${error.message}`)
      );
  }, []);

  const getUserChoices = useCallback(() => {
    setUserChoices(UMPAds().getUserChoices());
  }, []);

  const reset = useCallback(() => {
    UMPAds().reset();
    setConsentInfo(null);
    setUserChoices(null);
    setStatus('Consent state reset — requesting again…');
    gatherConsent();
  }, [gatherConsent]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      {consentInfo && (
        <Text style={styles.status}>
          status: {consentInfo.status}
          {'\n'}
          privacyOptionsRequirementStatus:{' '}
          {consentInfo.privacyOptionsRequirementStatus}
        </Text>
      )}
      {userChoices && (
        <Text style={styles.status}>
          selectPersonalisedAds: {String(userChoices.selectPersonalisedAds)}
          {'\n'}
          usePreciseGeolocationData:{' '}
          {String(userChoices.usePreciseGeolocationData)}
        </Text>
      )}
      <View style={styles.buttons}>
        <Button title="Re-request consent info" onPress={gatherConsent} />
        <Button title="Show form (unconditional)" onPress={showForm} />
        <Button
          title="Show privacy options"
          disabled={consentInfo?.privacyOptionsRequirementStatus !== 'required'}
          onPress={showPrivacyOptions}
        />
        <Button title="Get user choices" onPress={getUserChoices} />
        <Button title="Reset" onPress={reset} />
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
