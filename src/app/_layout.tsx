import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LostRideNotice } from '@/components/LostRideNotice';
import { ErrorBoundary } from '@/kit/error-boundary';
import { VerreProvider, useTheme } from '@/kit/theme';
import { FeedbackProvider } from '@/kit/motion';
import { BootGate, ToastProvider } from '@/kit/ui';
import { store } from '@/state';
import { useRideSimulator } from '@/lib/simulator';

function Simulator() {
  useRideSimulator();
  return null;
}

function Shell() {
  const t = useTheme();
  const hydrate = useCallback(() => store.hydrate(), []);
  return (
    <ErrorBoundary>
      <ToastProvider>
        <FeedbackProvider>
          <StatusBar style={t.dark ? 'light' : 'dark'} />
          <BootGate hydrate={hydrate} recover={() => store.startFresh()} appName="Onyx Transit">
            <View style={{ flex: 1, backgroundColor: t.bg }}>
              <LostRideNotice />
              <Simulator />
              <View style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
              </View>
            </View>
          </BootGate>
        </FeedbackProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <VerreProvider>
        <Shell />
      </VerreProvider>
    </SafeAreaProvider>
  );
}
