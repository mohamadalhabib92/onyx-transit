import React from 'react';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { Banner, Button } from '@/kit/ui';
import { dismissLostRides, getLostRides, subscribeLostRides } from '@/lib/lost-rides';

/** Avertit quand une course saisie pendant le chargement est remplacée par les données déjà lues. */
export function LostRideNotice() {
  const lost = useSyncExternalStore(subscribeLostRides, getLostRides, getLostRides);
  if (!lost.length) return null;
  const list = lost.map((r) => r.label).join(', ');
  const plural = lost.length > 1;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <Banner
        kind="warning"
        title={plural ? 'Réservations non conservées' : 'Réservation non conservée'}
        text={
          plural
            ? `Les courses ${list} ont été demandées pendant le chargement, puis abandonnées lorsque les données déjà enregistrées ont été reprises.`
            : `La course ${list} a été demandée pendant le chargement, puis abandonnée lorsque les données déjà enregistrées ont été reprises.`
        }
        action={<Button small title="Compris" kind="secondary" onPress={dismissLostRides} />}
      />
    </View>
  );
}
