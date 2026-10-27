import React from 'react';
import type { ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@/kit/ui';
import { onyx } from '@/theme';
import { store } from '@/state';

export default function TabsLayout() {
  const signedIn = store.useSelect((s) => s.signedIn);
  if (!signedIn) return <Redirect href="/welcome" />;
  const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Ionicons name={name} color={color as string} size={size} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: onyx.primary,
        tabBarInactiveTintColor: onyx.textMuted,
        tabBarStyle: { backgroundColor: onyx.surface, borderTopColor: onyx.border, minHeight: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Réserver', tabBarIcon: icon('navigate') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trajets', tabBarIcon: icon('time') }} />
      <Tabs.Screen name="driver" options={{ title: 'Chauffeur', tabBarIcon: icon('speedometer') }} />
      <Tabs.Screen name="admin" options={{ title: 'Admin', tabBarIcon: icon('shield-checkmark') }} />
      <Tabs.Screen name="account" options={{ title: 'Compte', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}
