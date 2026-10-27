import React, { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
        <ToastProvider>
          <StatusBar style="light" />
          <BootGate hydrate={hydrate} appName="Onyx Transit">
            <Simulator />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: onyx.bg } }} />
          </BootGate>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
