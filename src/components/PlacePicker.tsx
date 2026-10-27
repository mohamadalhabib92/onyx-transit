import React, { useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { Banner, Button, Field, ListItem, Sheet, T } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { GENEVA_PLACES } from '@/data/places';
import type { Stop } from '@/state';
import { haversineKm } from '@/lib/pricing';

const GENEVA = { lat: 46.2044, lon: 6.1432 };

export function PlacePicker({
  visible,
  onClose,
  onPick,
  allowGps,
  gpsConsent,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (s: Stop) => void;
  allowGps?: boolean;
  gpsConsent: boolean;
  title: string;
}) {
  const t = useTheme();
  const [q, setQ] = useState('');
  const [gpsState, setGpsState] = useState<'idle' | 'loading' | 'denied' | 'error' | 'outside'>('idle');
  const list = GENEVA_PLACES.filter((p) => (p.name + ' ' + p.sub).toLowerCase().includes(q.trim().toLowerCase()));

  const useGps = async () => {
    setGpsState('loading');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return setGpsState('denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      if (haversineKm(here, GENEVA) > 35) return setGpsState('outside');
      setGpsState('idle');
      onPick({ ...here, label: 'Ma position actuelle' });
      onClose();
    } catch {
      setGpsState('error');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {allowGps ? (
        gpsConsent ? (
          <Button title="Utiliser ma position (GPS)" icon="locate" kind="secondary" loading={gpsState === 'loading'} onPress={useGps} full />
        ) : (
          <Banner kind="info" text="Localisation désactivée : activez le consentement « Localisation » dans Compte → Confidentialité pour utiliser le GPS." />
        )
      ) : null}
      {gpsState === 'denied' ? <Banner kind="warning" text="Permission de localisation refusée. Choisissez un lieu dans la liste." /> : null}
      {gpsState === 'error' ? <Banner kind="warning" text={`Position indisponible${Platform.OS === 'web' ? ' (le navigateur exige HTTPS)' : ''}. Choisissez un lieu dans la liste.`} /> : null}
      {gpsState === 'outside' ? <Banner kind="warning" text="Vous semblez hors de la zone desservie (Genève). Choisissez un lieu genevois." /> : null}
      <Field label="Rechercher un lieu" value={q} onChangeText={setQ} placeholder="Aéroport, gare, Carouge…" />
      {list.length === 0 ? (
        <T v="small" muted>
          Aucun lieu ne correspond. La recherche d’adresses libres nécessite un service de géocodage (Phase 2).
        </T>
      ) : null}
      {list.map((p) => (
        <ListItem
          key={p.id}
          icon={p.id === 'gva' ? 'airplane' : p.id === 'cornavin' ? 'train' : 'location'}
          iconColor={t.primary}
          title={p.name}
          sub={p.sub}
          onPress={() => {
            onPick({ lat: p.lat, lon: p.lon, label: p.name });
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}
