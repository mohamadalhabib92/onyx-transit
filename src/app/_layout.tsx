import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LostRideNotice } from '@/components/LostRideNotice';
import { ErrorBoundary } from '@/kit/error-boundary';
import { ThemeProvider } from '@/kit/theme';
import { BootGate, ToastProvider } from '@/kit/ui';
import { onyx } from '@/theme';
import { store } from '@/state';
import { useRideSimulator } from '@/lib/simulator';

function Simulator() {
  useRideSimulator();
  return null;
}

export default function RootLayout() {
  const hydrate = useCallback(() => store.hydrate(), []);
  return (
    <SafeAreaProvider>
      <ThemeProvider value={onyx}>
        <ErrorBoundary>
          <ToastProvider>
            <StatusBar style="light" />
            <BootGate hydrate={hydrate} recover={() => store.startFresh()} appName="Onyx Transit">
              <View style={{ flex: 1 }}>
                <LostRideNotice />
                <Simulator />
                <View style={{ flex: 1 }}>
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: onyx.bg } }} />
                </View>
              </View>
            </BootGate>
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
