import React from 'react';
import type { ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useReducedTransparency } from '@/kit/access';
import { useTheme } from '@/kit/theme';
import { Ionicons } from '@/kit/ui';
import { store } from '@/state';
import { useWindowDimensions } from 'react-native';

export default function TabsLayout() {
  // Libellés d'onglets : suivent la taille de texte du système jusqu'à ×1,4, au-delà la barre déborderait.
  const t = useTheme();
  const solid = useReducedTransparency();
  const { fontScale } = useWindowDimensions();
  const tabFs = (n: number) => Math.round(n * Math.min(fontScale, 1.4));
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
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: {
          backgroundColor: solid ? t.surface : t.glassStrong,
          borderTopColor: t.highlight,
          borderTopWidth: 1,
          minHeight: 60,
        },
        tabBarItemStyle: { minHeight: 44 },
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: { fontSize: tabFs(11), fontWeight: '600' },
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
