import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Banner, Button, Card, Chip, DemoBadge, Divider, EmptyState, Ionicons, OfflineBadge, Progress, Row, Screen, T, ToggleRow, useToast } from '@/kit/ui';
import { alpha, useTheme } from '@/kit/theme';
import { useOnline } from '@/kit/net';
import { fmtMoney, fmtNumber, fmtTime } from '@/kit/format';
import { RouteMap } from '@/components/RouteMap';
import { PlacePicker } from '@/components/PlacePicker';
import { CATEGORIES, estimate, type CategoryId } from '@/lib/pricing';
import { CITIES } from '@/data/places';
import { activeRide, newRide, PAYMENT_LABEL, STATUS_LABEL, store, updateRide, type Ride, type Stop } from '@/state';

const STEPS: Ride['status'][] = ['requested', 'accepted', 'arriving', 'in_progress', 'completed'];

function ActiveRide({ ride }: { ride: Ride }) {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const autoSim = store.useSelect((s) => s.autoSim);
  const idx = STEPS.indexOf(ride.status);
  const car = ride.status === 'accepted' ? { leg: 'approach' as const, t: ride.progress } : ride.status === 'arriving' ? { leg: 'approach' as const, t: 1 } : ride.status === 'in_progress' ? { leg: 'trip' as const, t: ride.progress } : null;
  const eta = ride.status === 'accepted' ? Math.max(1, Math.round((1 - ride.progress) * 6)) : ride.status === 'in_progress' ? Math.max(1, Math.round((1 - ride.progress) * ride.minutes)) : null;
  const cat = CATEGORIES.find((c) => c.id === ride.category)!;
  return (
    <>
      {ride.simulated ? (
        <Banner kind="demo" title="Suivi simulé — démonstration" text="Aucun véhicule réel n’est engagé. La position et les étapes sont générées localement pour illustrer le parcours." />
      ) : ride.status === 'requested' ? (
        <Banner kind="info" title="En attente d’un chauffeur" text="Mode démo sur un seul appareil : ouvrez l’onglet Chauffeur, passez en ligne et acceptez la demande." />
      ) : null}
      <RouteMap pickup={ride.pickup} dropoff={ride.dropoff} car={car} label={`${ride.pickup.label} → ${ride.dropoff.label}`} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">{STATUS_LABEL[ride.status]}</T>
          {eta != null ? <Badge label={`≈ ${eta} min`} icon="time" color={t.primary} /> : null}
        </Row>
        <Progress value={(idx + (ride.status === 'accepted' || ride.status === 'in_progress' ? ride.progress : 0)) / (STEPS.length - 1)} />
        <Row style={{ justifyContent: 'space-between' }}>
          {['Demande', 'En route', 'Arrivé', 'En course'].map((l, i) => (
            <T key={l} v="caption" color={i <= idx ? t.primary : t.textMuted}>
              {l}
            </T>
          ))}
        </Row>
        {ride.status === 'requested' ? (
          <T v="small" muted>
            Recherche du chauffeur le plus proche…
          </T>
        ) : (
          <Row>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={24} color={t.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{ride.driverName ?? 'Chauffeur'}</T>
              <T v="small" muted>
                {cat.name} · plaque GE ••• {ride.simulated ? '(démo)' : ''}
              </T>
            </View>
            <Ionicons name={cat.icon} size={28} color={t.primary} />
          </Row>
        )}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <T muted>Prix estimé</T>
          <T v="h3">{fmtMoney(ride.price, ride.currency)}</T>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T muted>Paiement</T>
          <T v="small">{PAYMENT_LABEL[ride.payment]}</T>
        </Row>
      </Card>
      {ride.simulated ? <ToggleRow label="Simulation automatique" sub="Désactivez pour mettre le suivi en pause" value={autoSim} onChange={(v) => store.set((s) => ({ ...s, autoSim: v }))} /> : null}
      <Row wrap>
        {['requested', 'accepted'].includes(ride.status) ? (
          <Button
            title="Annuler la course"
            kind="danger"
            icon="close-circle"
            onPress={() => {
              updateRide(ride.id, { status: 'cancelled' }, 'Annulée par le client');
              toast('Course annulée — aucuns frais (démo)', 'info');
            }}
          />
        ) : null}
        <Button title="Assistance" kind="secondary" icon="help-buoy" onPress={() => router.push('/support')} />
      </Row>
    </>
  );
}

export default function Book() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const s = store.use();
  const ride = activeRide(s);
  const lastDone = s.rides.find((r) => !r.demo && r.status === 'completed' && !r.rating && Date.now() - r.createdAt < 1000 * 60 * 60 * 6);
  const [pickup, setPickup] = useState<Stop | null>(null);
  const [dropoff, setDropoff] = useState<Stop | null>(null);
  const [cat, setCat] = useState<CategoryId>('business');
  const [picker, setPicker] = useState<'pickup' | 'dropoff' | null>(null);
  const [city, setCity] = useState<'geneve' | 'paris' | 'casablanca'>('geneve');
  const enabledCities = CITIES.filter((c) => s.cities[c.id]);

  const est = useMemo(() => (pickup && dropoff ? CATEGORIES.map((c) => ({ c, e: estimate(pickup, dropoff, c) })) : null), [pickup, dropoff]);
  const chosen = est?.find((x) => x.c.id === cat);
  const same = pickup && dropoff && pickup.label === dropoff.label;

  const book = () => {
    if (!pickup || !dropoff || !chosen) return;
    const r = newRide({ pickup, dropoff, category: cat, km: chosen.e.km, minutes: chosen.e.min, price: chosen.e.price, currency: 'CHF', simulated: s.autoSim, demo: false, payment: s.payment });
    store.set((x) => ({ ...x, rides: [r, ...x.rides] }));
    toast('Demande envoyée', 'success');
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T v="caption" muted>
            Bonjour {s.profile.name.split(' ')[0] || ''}
          </T>
          <T v="h1">{ride ? 'Votre course' : 'Où allons-nous ?'}</T>
        </View>
        {!online ? <OfflineBadge /> : <Badge label="Genève" icon="location" color={t.primary} />}
      </Row>

      {ride ? (
        <ActiveRide ride={ride} />
      ) : (
        <>
          {lastDone ? (
            <Banner kind="success" title="Course terminée" text="Merci d’avoir voyagé avec Onyx. Notez votre chauffeur et téléchargez votre reçu." action={<Button small title="Voir le reçu" onPress={() => router.push(`/ride/${lastDone.id}`)} />} />
          ) : null}
          {enabledCities.length > 1 ? (
            <Row wrap>
              {enabledCities.map((c) => (
                <Chip key={c.id} label={c.name} selected={city === c.id} onPress={() => setCity(c.id)} />
              ))}
            </Row>
          ) : null}
          {city !== 'geneve' ? (
            <EmptyState icon="construct" title={`${CITIES.find((c) => c.id === city)?.name} — bientôt`} text="Ville activée par l’admin, mais le pack local (lieux, tarifs, réglementation, chauffeurs) n’est pas encore préparé. Réservation indisponible." />
          ) : (
            <>
              <Card>
                {(['pickup', 'dropoff'] as const).map((k, i) => {
                  const v = k === 'pickup' ? pickup : dropoff;
                  return (
                    <Pressable
                      key={k}
                      accessibilityRole="button"
                      accessibilityLabel={k === 'pickup' ? 'Choisir le départ' : 'Choisir la destination'}
                      onPress={() => setPicker(k)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: t.border }}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: k === 'pickup' ? 6 : 2, backgroundColor: k === 'pickup' ? t.success : t.primary }} />
                      <View style={{ flex: 1 }}>
                        <T v="caption" muted>
                          {k === 'pickup' ? 'Départ' : 'Destination'}
                        </T>
                        <T color={v ? t.text : t.textMuted}>{v?.label ?? (k === 'pickup' ? 'Lieu de prise en charge' : 'Où allez-vous ?')}</T>
                      </View>
                      <Ionicons name="search" size={18} color={t.textMuted} />
                    </Pressable>
                  );
                })}
              </Card>

              <RouteMap pickup={pickup} dropoff={dropoff} />

              {same ? <Banner kind="warning" text="Le départ et la destination sont identiques." /> : null}

              {est && !same ? (
                <>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="h3">Catégorie</T>
                    <DemoBadge label="Tarifs indicatifs (démo)" />
                  </Row>
                  {est.map(({ c, e }) => {
                    const sel = c.id === cat;
                    return (
                      <Pressable
                        key={c.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: sel }}
                        accessibilityLabel={`${c.name}, ${fmtMoney(e.price, 'CHF')}`}
                        onPress={() => setCat(c.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: t.radius, borderWidth: 1.5, borderColor: sel ? t.primary : t.border, backgroundColor: sel ? alpha(t.primary, 0.08) : t.surface }}
                      >
                        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={c.icon} size={28} color={sel ? t.primary : t.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Row gap={6}>
                            <T v="h3">{c.name}</T>
                            <T v="small" muted>
                              · {c.seats} pl. · {c.bags} bag.
                            </T>
                          </Row>
                          <T v="small" muted>
                            {c.desc}
                          </T>
                          <T v="small" muted>
                            {fmtNumber(e.km, 1)} km · ≈ {e.min} min · arrivée ≈ {fmtTime(Date.now() + (e.min + 6) * 60000)}
                          </T>
                        </View>
                        <T v="h3" color={sel ? t.primary : t.text}>
                          {fmtMoney(e.price, 'CHF', 0)}
                        </T>
                      </Pressable>
                    );
                  })}
                  <Card onPress={() => router.push('/payments')} a11y="Changer le moyen de paiement">
                    <Row>
                      <Ionicons name="card" size={20} color={t.primary} />
                      <T style={{ flex: 1 }}>{PAYMENT_LABEL[s.payment]}</T>
                      <T v="small" color={t.primary}>
                        Modifier
                      </T>
                    </Row>
                  </Card>
                  <ToggleRow label="Course simulée (démo)" sub="Activé : un chauffeur fictif accepte et le trajet est animé. Désactivé : la demande attend l’onglet Chauffeur." value={s.autoSim} onChange={(v) => store.set((x) => ({ ...x, autoSim: v }))} />
                  <Button title={`Commander ${chosen?.c.name ?? ''} · ${chosen ? fmtMoney(chosen.e.price, 'CHF', 0) : ''}`} icon="checkmark-circle" onPress={book} full />
                  <T v="small" muted center>
                    Estimation fondée sur la distance (vol d’oiseau × 1,3) et un temps urbain moyen. Prix final confirmé par l’opérateur.
                  </T>
                </>
              ) : !pickup || !dropoff ? (
                <EmptyState icon="navigate-circle" title="Choisissez départ et destination" text="Aéroport, gare, hôtels, organisations internationales : sélectionnez un lieu ou utilisez votre position." />
              ) : null}
            </>
          )}
        </>
      )}
      <PlacePicker
        visible={picker !== null}
        onClose={() => setPicker(null)}
        title={picker === 'pickup' ? 'Départ' : 'Destination'}
        allowGps={picker === 'pickup'}
        gpsConsent={s.consents.location}
        onPick={(p) => (picker === 'pickup' ? setPickup(p) : setDropoff(p))}
      />
    </Screen>
  );
}
