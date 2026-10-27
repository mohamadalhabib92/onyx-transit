import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Banner, Button, Card, Chip, EmptyState, Field, ListItem, Row, Screen, Section, Stat, T, ToggleRow, useToast } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { isConfigured, maskValue } from '@/kit/config';
import { fmtDateTime, fmtMoney } from '@/kit/format';
import { exportText, toCSV } from '@/kit/files';
import { CITIES } from '@/data/places';
import { CONFIG, ENV } from '@/config';
import { DRIVER_DOCS, STATUS_LABEL, store, updateRide } from '@/state';

type Tab = 'rides' | 'users' | 'drivers' | 'disputes' | 'cities' | 'system';
const TABS: { key: Tab; label: string }[] = [
  { key: 'rides', label: 'Courses' },
  { key: 'users', label: 'Utilisateurs' },
  { key: 'drivers', label: 'Chauffeurs' },
  { key: 'disputes', label: 'Litiges' },
  { key: 'cities', label: 'Villes' },
  { key: 'system', label: 'Système' },
];

export default function Admin() {
  const t = useTheme();
  const toast = useToast();
  const router = useRouter();
  const s = store.use();
  const [tab, setTab] = useState<Tab>('rides');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const done = s.rides.filter((r) => r.status === 'completed');
  const real = done.filter((r) => !r.simulated && !r.demo);
  const active = s.rides.filter((r) => ['requested', 'accepted', 'arriving', 'in_progress'].includes(r.status));
  const disputes = s.rides.filter((r) => r.dispute);
  const rated = done.filter((r) => r.rating);

  return (
    <Screen>
      <T v="h1">Administration</T>
      <Banner kind="info" text="Console locale : toutes les valeurs sont calculées à partir des données de cet appareil. Aucun indicateur n’est inventé." />
      <Row wrap>
        {TABS.map((x) => (
          <Chip key={x.key} label={x.label} selected={tab === x.key} onPress={() => setTab(x.key)} />
        ))}
      </Row>

      {tab === 'rides' ? (
        <>
          <Row wrap>
            <Stat label="Courses totales" value={String(s.rides.length)} sub={`${active.length} en cours`} />
            <Stat label="Terminées" value={String(done.length)} sub={`dont ${real.length} non simulées`} />
            <Stat label="Volume (non simulé)" value={fmtMoney(real.reduce((a, r) => a + r.price, 0), 'CHF', 0)} sub="estimations, non encaissé" />
            <Stat label="Note moyenne" value={rated.length ? (rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length).toFixed(1).replace('.', ',') : '—'} sub={`${rated.length} avis`} />
          </Row>
          <Button
            title="Exporter les courses (CSV)"
            kind="secondary"
            icon="download"
            disabled={!s.rides.length}
            onPress={() =>
              exportText(
                'onyx-courses.csv',
                toCSV([
                  ['id', 'date', 'depart', 'destination', 'categorie', 'km', 'minutes', 'prix_chf', 'statut', 'simulee', 'test', 'note'],
                  ...s.rides.map((r) => [r.id, fmtDateTime(r.createdAt), r.pickup.label, r.dropoff.label, r.category, r.km, r.minutes, r.price, STATUS_LABEL[r.status], r.simulated ? 'oui' : 'non', r.demo ? 'oui' : 'non', r.rating ?? '']),
                ]),
                'text/csv'
              )
            }
          />
          {s.rides.length === 0 ? (
            <EmptyState icon="car-outline" title="Aucune course" text="Les courses commandées sur cet appareil apparaîtront ici." />
          ) : (
            <Card>
              {s.rides.map((r) => (
                <ListItem
                  key={r.id}
                  icon="car-sport"
                  iconColor={r.status === 'completed' ? t.success : r.status === 'cancelled' ? t.danger : t.primary}
                  title={`${r.pickup.label} → ${r.dropoff.label}`}
                  sub={`${fmtDateTime(r.createdAt)} · ${STATUS_LABEL[r.status]} · ${fmtMoney(r.price, 'CHF', 0)}${r.simulated ? ' · simulée' : ''}${r.demo ? ' · test' : ''}`}
                  onPress={() => router.push(`/ride/${r.id}`)}
                />
              ))}
            </Card>
          )}
        </>
      ) : null}

      {tab === 'users' ? (
        <>
          <Card>
            <ListItem icon="person" title={s.profile.name || 'Profil local'} sub={`${s.profile.email} · rôle : ${s.role} · consentements ${s.consents.at ? 'le ' + fmtDateTime(s.consents.at) : 'non datés'}`} />
          </Card>
          <EmptyState icon="people" title="Un seul utilisateur local" text="La liste multi-utilisateurs, la suspension de comptes et la vérification d’identité nécessitent le backend (Supabase non configuré)." />
        </>
      ) : null}

      {tab === 'drivers' ? (
        <Card>
          <T v="h3">{s.profile.name || 'Chauffeur local'}</T>
          <T v="small" muted>
            {s.driver.online ? 'En ligne' : 'Hors ligne'} · documents de l’espace chauffeur de cet appareil
          </T>
          {DRIVER_DOCS.map((d) => {
            const st = s.driver.docs[d.id];
            return (
              <ListItem
                key={d.id}
                title={d.label}
                sub={st === 'missing' ? 'Manquant' : st === 'uploaded_placeholder' ? 'À vérifier' : 'Validé (démo)'}
                icon="document-text"
                iconColor={st === 'validated_demo' ? t.success : st === 'missing' ? t.warning : t.info}
                right={
                  st === 'uploaded_placeholder' ? (
                    <Button small title="Valider" kind="success" onPress={() => store.set((x) => ({ ...x, driver: { ...x.driver, docs: { ...x.driver.docs, [d.id]: 'validated_demo' } } }))} />
                  ) : undefined
                }
              />
            );
          })}
        </Card>
      ) : null}

      {tab === 'disputes' ? (
        disputes.length === 0 ? (
          <EmptyState icon="happy" title="Aucun litige" text="Les réclamations ouvertes depuis un reçu apparaissent ici." />
        ) : (
          disputes.map((r) => (
            <Card key={r.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="h3" style={{ flex: 1 }}>
                  {r.dispute!.reason}
                </T>
                <Badge label={r.dispute!.status === 'open' ? 'Ouvert' : 'Résolu'} color={r.dispute!.status === 'open' ? t.warning : t.success} />
              </Row>
              <T v="small" muted>
                {r.pickup.label} → {r.dropoff.label} · {fmtMoney(r.price, 'CHF')} · {fmtDateTime(r.dispute!.at)}
              </T>
              {r.dispute!.status === 'open' ? (
                <>
                  <Field label="Réponse / geste commercial" value={notes[r.id] ?? ''} onChangeText={(v) => setNotes({ ...notes, [r.id]: v })} placeholder="Ex. : remboursement de 10 % proposé" />
                  <Button
                    title="Clore à l’amiable"
                    kind="success"
                    onPress={() => {
                      updateRide(r.id, { dispute: { ...r.dispute!, status: 'resolved', note: notes[r.id]?.trim() || 'Résolu à l’amiable' } }, 'Réclamation résolue');
                      toast('Litige clos', 'success');
                    }}
                  />
                </>
              ) : (
                <T v="small">{r.dispute!.note}</T>
              )}
            </Card>
          ))
        )
      ) : null}

      {tab === 'cities' ? (
        <Card>
          {CITIES.map((c) => (
            <ToggleRow
              key={c.id}
              label={`${c.name} (${c.country})`}
              sub={c.id === 'geneve' ? 'Ville de lancement — active' : 'Pack local non préparé : la réservation affichera « bientôt »'}
              value={s.cities[c.id]}
              disabled={c.id === 'geneve'}
              onChange={(v) => store.set((x) => ({ ...x, cities: { ...x.cities, [c.id]: v } }))}
            />
          ))}
        </Card>
      ) : null}

      {tab === 'system' ? (
        <>
          <Section title="Backend cible">
            <Card>
              <T v="mono" selectable>
                EXPO_PUBLIC_API_BASE_URL = {ENV.apiBaseUrl}
              </T>
              <T v="small" muted>
                {isConfigured(ENV.apiBaseUrl)
                  ? 'Backend configuré.'
                  : 'Non configuré : l’app fonctionne en mode local. Renseignez l’URL de votre API (dispatch, paiements côté serveur, webhooks Stripe) dans .env puis reconstruisez. Aucune URL n’est devinée.'}
              </T>
              <T v="small" muted>
                Ancien backend Vibecode (clover-maritime.vibecode.run) : non repris par défaut — à réutiliser uniquement si vous confirmez qu’il s’agit du backend réel actif.
              </T>
            </Card>
          </Section>
          <Section title="Configuration">
            <Card>
              {CONFIG.map((c) => (
                <View key={c.name} style={{ paddingVertical: 6, gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="mono">{c.name}</T>
                    <Badge label={isConfigured(c.value) ? 'OK' : c.phase ?? 'Manquant'} color={isConfigured(c.value) ? t.success : t.warning} />
                  </Row>
                  <T v="small" muted>
                    {maskValue(c)} — {c.note}
                  </T>
                </View>
              ))}
            </Card>
          </Section>
          <Section title="Expérimental">
            <Card>
              <ToggleRow label="Dispatch IA (Phase 2)" sub="Attribution automatique optimisée. Désactivé : nécessite le backend et un modèle côté serveur." value={false} disabled onChange={() => {}} />
            </Card>
          </Section>
        </>
      ) : null}
    </Screen>
  );
}
