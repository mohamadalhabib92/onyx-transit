import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { Badge, Banner, Button, Card, Chip, DemoBadge, EmptyState, Field, Ionicons, ListItem, Row, Screen, Section, Stat, T, ToggleRow, useToast } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { fmtDate, fmtMoney, fmtNumber, fmtTime } from '@/kit/format';
import { GENEVA_PLACES } from '@/data/places';
import { CATEGORIES, estimate, type CategoryId } from '@/lib/pricing';
import { parseIsoDate } from '@/lib/rules';
import { advanceRide, ALL_DOCS, DRIVER_DOCS, newRide, onlineBlockers, placeRide, shareRate, STATUS_LABEL, store, VEHICLE_DOCS, type DocStatus, type Stop } from '@/state';
import { backendReady } from '@/config';
import { RouteMap } from '@/components/RouteMap';
import { useFeedback } from '@/kit/motion';

const DOC_LABEL: Record<DocStatus, string> = { missing: 'Manquant', uploaded_placeholder: 'Ajouté — en attente de validation', validated_demo: 'Validé (démo admin)' };
const REASON: Record<string, string> = { missing: 'manquant', pending: 'en attente de validation', expired: 'expiré' };

function openNav(to: Stop) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lon}&travelmode=driving`).catch(() => {});
}

export default function Driver() {
  const t = useTheme();
  const toast = useToast();
  const { celebrate } = useFeedback();
  const s = store.use();
  const d = s.driver;
  const name = s.profile.name || 'Chauffeur Onyx';
  const blockers = onlineBlockers(s);
  const queue = s.rides.filter((r) => r.status === 'requested' && !r.simulated && !d.refused.includes(r.id));
  const current = s.rides.find((r) => !r.simulated && ['accepted', 'arriving', 'in_progress'].includes(r.status));
  const sessionRides = s.rides.filter((r) => !r.simulated && r.status === 'completed' && d.sessionStart && r.createdAt >= d.sessionStart).length;
  const [expiryDraft, setExpiryDraft] = useState<Record<string, string>>({});
  const share = Math.round(shareRate(s) * 100);

  useEffect(() => {
    if (!d.online || blockers.length === 0) return;
    store.set((x) => (x.driver.online ? { ...x, driver: { ...x.driver, online: false } } : x));
    toast('Mise hors ligne : un document obligatoire est manquant, non validé ou expiré.', 'error');
  }, [d.online, blockers, toast]);

  const testRequest = () => {
    const shuffled = [...GENEVA_PLACES].sort(() => Math.random() - 0.5);
    const [a, b] = shuffled;
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const e = estimate(a, b, cat);
    const r = newRide({ pickup: { lat: a.lat, lon: a.lon, label: a.name }, dropoff: { lat: b.lat, lon: b.lon, label: b.name }, category: cat.id, km: e.km, minutes: e.min, price: e.price, currency: 'CHF', simulated: false, demo: true, payment: 'simulated' });
    placeRide(r);
    toast('Demande de test créée', 'info');
  };

  const addDoc = (id: string) => {
    const raw = (expiryDraft[id] ?? '').trim();
    let expiresAt: string | null = null;
    if (raw) {
      const parsed = parseIsoDate(raw);
      if (!parsed) {
        toast('Date d’échéance invalide. Format AAAA-MM-JJ.', 'error');
        return;
      }
      expiresAt = parsed;
    }
    store.set((x) => ({
      ...x,
      driver: { ...x.driver, docs: { ...x.driver.docs, [id]: 'uploaded_placeholder' }, docExpiry: { ...x.driver.docExpiry, [id]: expiresAt } },
    }));
    toast('Statut enregistré — fichier non envoyé (stockage non configuré)', 'info');
  };

  const renderDocs = (docs: typeof ALL_DOCS) =>
    docs.map((doc) => {
      const st = d.docs[doc.id] ?? 'missing';
      const exp = d.docExpiry?.[doc.id];
      const expLabel = exp ? ` · échéance ${fmtDate(exp + 'T12:00:00')}` : '';
      return (
        <View key={doc.id} style={{ gap: 6 }}>
          <ListItem
            icon={st === 'missing' ? 'document-outline' : 'document-text'}
            iconColor={st === 'missing' ? t.warning : st === 'validated_demo' ? t.success : t.info}
            title={doc.label}
            sub={`${DOC_LABEL[st]}${expLabel}${doc.required ? '' : ' · facultatif'}`}
          />
          {st === 'missing' ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="Échéance (facultatif)" value={expiryDraft[doc.id] ?? ''} onChangeText={(v) => setExpiryDraft({ ...expiryDraft, [doc.id]: v })} placeholder="AAAA-MM-JJ" autoCapitalize="none" />
              </View>
            </Row>
          ) : null}
          {st === 'missing' ? <Button small kind="secondary" title="Ajouter" onPress={() => addDoc(doc.id)} /> : null}
        </View>
      );
    });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Espace chauffeur</T>
        <Badge label={d.online ? 'En ligne' : 'Hors ligne'} color={d.online ? t.success : t.textMuted} icon={d.online ? 'radio' : 'moon'} />
      </Row>
      <Banner kind="demo" text="Démo sur un seul appareil : l’espace chauffeur voit les demandes passées sur ce même téléphone ou navigateur (courses non simulées). Le dispatch multi-appareils nécessite le backend (YOUR_API_BASE_URL)." />

      <Card>
        <ToggleRow
          label={d.online ? 'Vous êtes en ligne' : 'Passer en ligne'}
          sub={d.online && d.sessionStart ? `Session démarrée à ${fmtTime(d.sessionStart)}` : 'Recevez les demandes de course'}
          value={d.online}
          onChange={(v) => {
            const blocks = onlineBlockers();
            if (v && blocks.length) {
              toast('Mise en ligne bloquée : ' + blocks.map((b) => `${b.label} (${REASON[b.reason] ?? b.reason})`).join(', '), 'error');
              return;
            }
            store.set((x) => ({ ...x, driver: { ...x.driver, online: v, sessionStart: v ? Date.now() : x.driver.sessionStart, sessionEarnings: v ? 0 : x.driver.sessionEarnings } }));
          }}
        />
        {blockers.length ? (
          <Banner kind="warning" title="Mise en ligne bloquée" text={blockers.map((b) => `${b.label} — ${REASON[b.reason] ?? b.reason}`).join(' · ')} />
        ) : (
          <Banner kind="success" text="Documents obligatoires validés et non expirés. La validation reste une démo locale tant que le stockage n’est pas configuré." />
        )}
      </Card>

      <Row wrap>
        <Stat label="Gains de la session" value={fmtMoney(d.sessionEarnings, 'CHF', 0)} sub={`Hypothèse de démo ${share} % — non contractuelle, masquée au client`} demo />
        <Stat label="Courses (session)" value={String(sessionRides)} sub="terminées" />
      </Row>

      {current ? (
        <Section title="Course en cours">
          <RouteMap
            pickup={current.pickup}
            dropoff={current.dropoff}
            pickupName={current.pickup.label}
            dropoffName={current.dropoff.label}
            car={current.status === 'in_progress' ? { leg: 'trip', t: current.progress } : { leg: 'approach', t: current.status === 'arriving' ? 1 : current.progress }}
          />
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h3">{STATUS_LABEL[current.status]}</T>
              <T v="h3" tabular color={t.primary}>
                {fmtMoney(current.priceMaximum ?? current.price, 'CHF', 0)}
              </T>
            </Row>
            <T v="small" muted>
              Prix maximum. {current.pickup.label} → {current.dropoff.label} {current.demo ? '· demande de test' : ''}
              {current.assignedDriverId ? ' · attribuée par l’admin' : ''}
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
                <Button
                  title="Terminer la course"
                  icon="checkmark-done"
                  kind="success"
                  onPress={() => {
                    advanceRide(current.id, name);
                    celebrate({ title: 'Course terminée', subtitle: 'Merci pour ce trajet tout en douceur.', icon: 'checkmark-done', tone: 'gold' });
                  }}
                />
              </>
            )}
          </Card>
        </Section>
      ) : (
        <Section title="Demandes" action={<Button small kind="ghost" title="Créer une demande test" icon="add" onPress={testRequest} />}>
          {!d.online ? (
            <EmptyState icon="moon" title="Vous êtes hors ligne" text="Passez en ligne pour voir les demandes. La mise en ligne exige des documents validés." />
          ) : queue.length === 0 ? (
            <EmptyState icon="hourglass" title="Aucune demande" text="Désactivez « Course simulée » côté client puis commandez, ou créez une demande test." />
          ) : (
            queue.map((r) => (
              <Card key={r.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="h3">{CATEGORIES.find((c) => c.id === r.category)?.name}</T>
                  <Row gap={6}>
                    {r.demo ? <DemoBadge label="Test" /> : null}
                    {r.assignedDriverId ? <Badge label="Attribuée" color={t.success} /> : null}
                    <T v="h3" tabular color={t.primary}>
                      {fmtMoney(r.priceMaximum ?? r.price, 'CHF', 0)}
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
                  {fmtNumber(r.km, 1)} km · ≈ {r.minutes} min · gain estimé {fmtMoney((r.priceMaximum ?? r.price) * shareRate(s), 'CHF', 0)} (hypothèse)
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

      <Section title="Documents chauffeur">
        <Card>
          <T v="small" muted>
            La mise en ligne est bloquée sans carte VTC, permis B121, pièce d’identité et contrat validés et non expirés. Le libellé B121 est à valider. Rappel à 30 jours, blocage à l’échéance.
          </T>
          {!backendReady ? (
            <T v="small" muted>
              Stockage de documents non configuré (YOUR_SUPABASE_URL) : les fichiers ne sont pas envoyés ; seul le statut est enregistré localement.
            </T>
          ) : null}
          {renderDocs(DRIVER_DOCS)}
          <Field label="N° de carte VTC (facultatif)" value={d.vtcCardNumber} onChangeText={(v) => store.set((x) => ({ ...x, driver: { ...x.driver, vtcCardNumber: v } }))} placeholder="Non renseigné" autoCapitalize="characters" />
        </Card>
      </Section>
      <Section title="Véhicule">
        <Card>
          <Row>
            <View style={{ width: 64, height: 44, borderRadius: 10, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="car-sport-outline" size={30} color={t.primary} />
            </View>
            <T v="small" muted style={{ flex: 1 }}>
              Silhouette générique. Aucune photo de marque.
            </T>
          </Row>
          <T v="label" muted>
            Catégorie
          </T>
          <Row wrap>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.name} selected={d.vehicleCategory === c.id} onPress={() => store.set((x) => ({ ...x, driver: { ...x.driver, vehicleCategory: c.id as CategoryId } }))} />
            ))}
          </Row>
          <Field
            label="Places"
            value={d.vehicleSeats == null ? '' : String(d.vehicleSeats)}
            onChangeText={(v) => {
              const n = Number(v.replace(',', '.'));
              store.set((x) => ({ ...x, driver: { ...x.driver, vehicleSeats: v.trim() === '' || !Number.isFinite(n) ? null : Math.round(n) } }));
            }}
            keyboardType="number-pad"
            placeholder="Ex. 3"
          />
          <Field label="Plaque (facultatif)" value={d.plateLabel} onChangeText={(v) => store.set((x) => ({ ...x, driver: { ...x.driver, plateLabel: v } }))} placeholder="Non renseignée" autoCapitalize="characters" />
          {renderDocs(VEHICLE_DOCS)}
        </Card>
      </Section>
    </Screen>
  );
}
