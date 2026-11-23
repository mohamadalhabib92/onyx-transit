import React from 'react';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { Banner, Button } from '@/kit/ui';
import { dismissLostRides, getLostRides, subscribeLostRides } from '@/lib/lost-rides';
import { store } from '@/state';

/** Avertit quand une course saisie pendant le chargement est remplacée par les données déjà lues. */
export function LostRideNotice() {
  const lost = useSyncExternalStore(subscribeLostRides, getLostRides, getLostRides);
  const write = store.useWriteHealth();
  if (!lost.length && write.status !== 'failed') return null;
  const list = lost.map((r) => r.label).join(', ');
  const plural = lost.length > 1;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
      {write.status === 'failed' ? (
        <Banner
          kind="danger"
          title="Enregistrement non confirmé"
          text={`${write.detail} Les courses, adresses et historiques déjà stockés restent la copie précédente. Ceci n’est pas une sauvegarde de l’appareil.`}
        />
      ) : null}
      {lost.length ? (
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
      ) : null}
    </View>
  );
}
