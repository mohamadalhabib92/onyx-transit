import React from 'react';
import { useRouter } from 'expo-router';
import { Badge, Card, EmptyState, Button, ListItem, Screen, T } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { fmtDateTime, fmtMoney } from '@/kit/format';
import { STATUS_LABEL, store } from '@/state';

export default function Trips() {
  const t = useTheme();
  const router = useRouter();
  const rides = store.useSelect((s) => s.rides);
  const color = (st: string) => (st === 'completed' ? t.success : st === 'cancelled' ? t.danger : t.primary);
  return (
    <Screen>
      <T v="h1">Mes trajets</T>
      {rides.length === 0 ? (
        <EmptyState icon="car-outline" title="Aucun trajet pour l’instant" text="Vos courses, reçus et évaluations apparaîtront ici." action={<Button title="Réserver" onPress={() => router.push('/(tabs)')} />} />
      ) : (
        <Card>
          {rides.map((r) => (
            <ListItem
              key={r.id}
              icon={r.status === 'completed' ? 'checkmark-circle' : r.status === 'cancelled' ? 'close-circle' : 'car-sport'}
              iconColor={color(r.status)}
              title={`${r.pickup.label} → ${r.dropoff.label}`}
              sub={`${fmtDateTime(r.createdAt)} · ${fmtMoney(r.price, r.currency, 0)} · ${STATUS_LABEL[r.status]}${r.demo ? ' · test' : ''}${r.simulated ? ' · simulée' : ''}`}
              right={r.dispute?.status === 'open' ? <Badge label="Litige" color={t.warning} /> : undefined}
              onPress={() => router.push(`/ride/${r.id}`)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
