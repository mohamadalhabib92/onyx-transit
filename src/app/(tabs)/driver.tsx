import React from 'react';
import { Linking, View } from 'react-native';
import { Badge, Banner, Button, Card, DemoBadge, EmptyState, Ionicons, ListItem, Row, Screen, Section, Stat, T, ToggleRow, useToast } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { fmtMoney, fmtNumber, fmtTime } from '@/kit/format';
import { GENEVA_PLACES } from '@/data/places';
import { CATEGORIES, estimate } from '@/lib/pricing';
import { advanceRide, DRIVER_DOCS, DRIVER_SHARE, newRide, STATUS_LABEL, store, type DocStatus, type Stop } from '@/state';
import { backendReady } from '@/config';
import { RouteMap } from '@/components/RouteMap';

const DOC_LABEL: Record<DocStatus, string> = { missing: 'Manquant', uploaded_placeholder: 'Ajouté (local)', validated_demo: 'Validé (démo admin)' };

function openNav(to: Stop) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lon}&travelmode=driving`).catch(() => {});
}

export default function Driver() {
  const t = useTheme();
  const toast = useToast();
  const s = store.use();
  const d = s.driver;
  const name = s.profile.name || 'Chauffeur';
  const docsOk = DRIVER_DOCS.every((x) => d.docs[x.id] !== 'missing');
  const queue = s.rides.filter((r) => r.status === 'requested' && !r.simulated && !d.refused.includes(r.id));
  const current = s.rides.find((r) => !r.simulated && ['accepted', 'arriving', 'in_progress'].includes(r.status));
  const sessionRides = s.rides.filter((r) => !r.simulated && r.status === 'completed' && d.sessionStart && r.createdAt >= d.sessionStart).length;

  const testRequest = () => {
    const shuffled = [...GENEVA_PLACES].sort(() => Math.random() - 0.5);
    const [a, b] = shuffled;
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const e = estimate(a, b, cat);
    const r = newRide({ pickup: { lat: a.lat, lon: a.lon, label: a.name }, dropoff: { lat: b.lat, lon: b.lon, label: b.name }, category: cat.id, km: e.km, minutes: e.min, price: e.price, currency: 'CHF', simulated: false, demo: true, payment: 'simulated' });
    store.set((x) => ({ ...x, rides: [r, ...x.rides] }));
    toast('Demande de test créée', 'info');
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Espace chauffeur</T>
        <Badge label={d.online ? 'En ligne' : 'Hors ligne'} color={d.online ? t.success : t.textMuted} icon={d.online ? 'radio' : 'moon'} />
      </Row>
      <Banner kind="demo" text="Démo sur un seul appareil : l’espace chauffeur voit les demandes passées sur ce même téléphone/navigateur (courses non simulées). Le vrai dispatch multi-appareils nécessite le backend (YOUR_API_BASE_URL)." />

      <Card>
        <ToggleRow
          label={d.online ? 'Vous êtes en ligne' : 'Passer en ligne'}
          sub={d.online && d.sessionStart ? `Session démarrée à ${fmtTime(d.sessionStart)}` : 'Recevez les demandes de course'}
          value={d.online}
          onChange={(v) => store.set((x) => ({ ...x, driver: { ...x.driver, online: v, sessionStart: v ? Date.now() : x.driver.sessionStart, sessionEarnings: v ? 0 : x.driver.sessionEarnings } }))}
        />
        {!docsOk ? <Banner kind="warning" text="Documents incomplets : en production, la mise en ligne serait bloquée jusqu’à validation." /> : null}
      </Card>

      <Row wrap>
        <Stat label="Gains de la session" value={fmtMoney(d.sessionEarnings, 'CHF', 0)} sub={`Part chauffeur ${Math.round(DRIVER_SHARE * 100)} % (hypothèse démo)`} />
        <Stat label="Courses (session)" value={String(sessionRides)} sub="terminées" />
      </Row>

      {current ? (
        <Section title="Course en cours">
          <RouteMap
            pickup={current.pickup}
            dropoff={current.dropoff}
            car={current.status === 'in_progress' ? { leg: 'trip', t: current.progress } : { leg: 'approach', t: current.status === 'arriving' ? 1 : current.progress }}
          />
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h3">{STATUS_LABEL[current.status]}</T>
              <T v="h3" color={t.primary}>
                {fmtMoney(current.price, 'CHF', 0)}
              </T>
            </Row>
            <T v="small" muted>
              {current.pickup.label} → {current.dropoff.label} {current.demo ? '· demande de test' : ''}
            </T>
            {current.status === 'accepted' ? (
              <>
                <Button title="Naviguer vers la prise en charge" kind="secondary" icon="navigate" onPress={() => openNav(current.pickup)} />
                <Button title="Je suis arrivé" icon="flag" onPress={() => advanceRide(current.id, name)} />
              </>
            ) : current.status === 'arriving' ? (
              <Button title="Démarrer la course" icon="play" kind="success" onPress={() => advanceRide(current.id, name)} />
            ) : (
              <>
                <Button title="Naviguer vers la destination" kind="secondary" icon="navigate" onPress={() => openNav(current.dropoff)} />
                <Button title="Terminer la course" icon="checkmark-done" kind="success" onPress={() => { advanceRide(current.id, name); toast('Course terminée', 'success'); }} />
              </>
            )}
          </Card>
        </Section>
      ) : (
        <Section title="Demandes" action={<Button small kind="ghost" title="Créer une demande test" icon="add" onPress={testRequest} />}>
          {!d.online ? (
            <EmptyState icon="moon" title="Vous êtes hors ligne" text="Passez en ligne pour voir les demandes." />
          ) : queue.length === 0 ? (
            <EmptyState icon="hourglass" title="Aucune demande" text="Désactivez « Course simulée » côté client puis commandez, ou créez une demande test." />
          ) : (
            queue.map((r) => (
              <Card key={r.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="h3">{CATEGORIES.find((c) => c.id === r.category)?.name}</T>
                  <Row gap={6}>
                    {r.demo ? <DemoBadge label="Test" /> : null}
                    <T v="h3" color={t.primary}>
                      {fmtMoney(r.price, 'CHF', 0)}
                    </T>
                  </Row>
                </Row>
                <T v="small">
                  <Ionicons name="ellipse" size={10} color={t.success} /> {r.pickup.label}
                </T>
                <T v="small">
                  <Ionicons name="square" size={10} color={t.primary} /> {r.dropoff.label}
                </T>
                <T v="small" muted>
                  {fmtNumber(r.km, 1)} km · ≈ {r.minutes} min · gain estimé {fmtMoney(r.price * DRIVER_SHARE, 'CHF', 0)}
                </T>
                <Row>
                  <Button title="Refuser" kind="secondary" style={{ flex: 1 }} onPress={() => store.set((x) => ({ ...x, driver: { ...x.driver, refused: [...x.driver.refused, r.id] } }))} />
                  <Button title="Accepter" kind="success" style={{ flex: 1 }} onPress={() => advanceRide(r.id, name)} />
                </Row>
              </Card>
            ))
          )}
        </Section>
      )}

      <Section title="Documents">
        <Card>
          {!backendReady ? (
            <T v="small" muted>
              Stockage de documents non configuré (YOUR_SUPABASE_URL) : les fichiers ne sont pas envoyés ; seul le statut est enregistré localement.
            </T>
          ) : null}
          {DRIVER_DOCS.map((doc) => {
            const st = d.docs[doc.id] ?? 'missing';
            return (
              <ListItem
                key={doc.id}
                icon={st === 'missing' ? 'document-outline' : 'document-text'}
                iconColor={st === 'missing' ? t.warning : st === 'validated_demo' ? t.success : t.info}
                title={doc.label}
                sub={DOC_LABEL[st]}
                right={
                  st === 'missing' ? (
                    <Button
                      small
                      kind="secondary"
                      title="Ajouter"
                      onPress={() => {
                        store.set((x) => ({ ...x, driver: { ...x.driver, docs: { ...x.driver.docs, [doc.id]: 'uploaded_placeholder' } } }));
                        toast('Statut enregistré — fichier non envoyé (stockage non configuré)', 'info');
                      }}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </Card>
      </Section>
      <Section title="Véhicule">
        <Card>
          <Row>
            <View style={{ width: 64, height: 44, borderRadius: 10, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="car-sport-outline" size={30} color={t.primary} />
            </View>
            <T v="small" muted style={{ flex: 1 }}>
              Silhouette générique (aucune photo de marque). Modèle, plaque et photos du véhicule seront saisis à l’inscription chauffeur (Phase 1.1).
            </T>
          </Row>
        </Card>
      </Section>
    </Screen>
  );
}
