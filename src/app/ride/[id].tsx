import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Banner, Button, Card, Chip, Divider, EmptyState, Field, IconButton, Ionicons, Row, Screen, Section, T, useToast } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { fmtDateTime, fmtMoney, fmtNumber, fmtTime } from '@/kit/format';
import { exportText } from '@/kit/files';
import { RouteMap } from '@/components/RouteMap';
import { CATEGORIES } from '@/lib/pricing';
import { PAYMENT_LABEL, STATUS_LABEL, store, updateRide } from '@/state';

const REASONS = ['Prix différent de l’estimation', 'Retard important', 'Comportement du chauffeur', 'Objet oublié', 'Véhicule non conforme', 'Autre'];

export default function RideDetail() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ride = store.useSelect((s) => s.rides.find((r) => r.id === id));
  const profile = store.useSelect((s) => s.profile);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState<string | null>(null);

  const back = <IconButton icon="chevron-back" a11y="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/trips'))} />;
  if (!ride)
    return (
      <Screen>
        {back}
        <EmptyState icon="alert-circle" title="Trajet introuvable" text="Il a peut-être été supprimé de cet appareil." />
      </Screen>
    );
  const cat = CATEGORIES.find((c) => c.id === ride.category)!;
  const parts = [
    ['Prise en charge', cat.base],
    [`Distance (${fmtNumber(ride.km, 1)} km)`, ride.km * cat.perKm],
    [`Temps (${ride.minutes} min)`, ride.minutes * cat.perMin],
  ] as const;

  const receiptText = () =>
    [
      'ONYX TRANSIT — REÇU',
      `Réf. : ${ride.id}`,
      `Date : ${fmtDateTime(ride.createdAt)}`,
      `Client : ${profile.name} <${profile.email}>`,
      `Trajet : ${ride.pickup.label} → ${ride.dropoff.label}`,
      `Catégorie : ${cat.name} · ${fmtNumber(ride.km, 1)} km · ${ride.minutes} min`,
      ...parts.map(([l, v]) => `  ${l} : ${fmtMoney(v, ride.currency)}`),
      `  Minimum de course : ${fmtMoney(cat.min, ride.currency)}`,
      `TOTAL : ${fmtMoney(ride.price, ride.currency)}`,
      `Paiement : ${PAYMENT_LABEL[ride.payment]} — ${ride.paymentStatus === 'simulated_paid' ? 'simulé, aucun débit' : 'non encaissé (paiement non configuré)'}`,
      'TVA : selon numéro d’entreprise à configurer (YOUR_VAT_NUMBER).',
      ride.simulated ? 'DOCUMENT DE DÉMONSTRATION — course simulée.' : 'Reçu indicatif généré localement.',
    ]
      .filter(Boolean)
      .join('\n');

  return (
    <Screen>
      <Row>
        {back}
        <T v="h2" style={{ flex: 1 }}>
          Détail du trajet
        </T>
        <Badge label={STATUS_LABEL[ride.status]} color={ride.status === 'completed' ? t.success : ride.status === 'cancelled' ? t.danger : t.primary} />
      </Row>
      {ride.simulated ? <Banner kind="demo" text="Course simulée (démonstration) — aucun chauffeur ni paiement réel." /> : null}
      <RouteMap pickup={ride.pickup} dropoff={ride.dropoff} label={fmtDateTime(ride.createdAt)} />

      <Card>
        <T v="h3">Reçu</T>
        <T v="small" muted>
          {ride.pickup.label} → {ride.dropoff.label}
        </T>
        {parts.map(([l, v]) => (
          <Row key={l} style={{ justifyContent: 'space-between' }}>
            <T muted>{l}</T>
            <T>{fmtMoney(v, ride.currency)}</T>
          </Row>
        ))}
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small" muted>
            Minimum {cat.name}
          </T>
          <T v="small" muted>
            {fmtMoney(cat.min, ride.currency)}
          </T>
        </Row>
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">Total</T>
          <T v="h2" color={t.primary}>
            {fmtMoney(ride.price, ride.currency)}
          </T>
        </Row>
        <T v="small" muted>
          {PAYMENT_LABEL[ride.payment]} — {ride.paymentStatus === 'simulated_paid' ? 'paiement simulé, aucun débit réel' : ride.paymentStatus === 'pending' ? 'en attente' : 'non encaissé : paiement en ligne non configuré'}
        </T>
        <Button title="Télécharger le reçu (.txt)" kind="secondary" icon="download" onPress={() => exportText(`recu-onyx-${ride.id}.txt`, receiptText())} />
      </Card>

      {ride.status === 'completed' ? (
        <Card>
          <T v="h3">Évaluer le chauffeur</T>
          {ride.rating ? (
            <Row>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons key={i} name={i < ride.rating! ? 'star' : 'star-outline'} size={24} color={t.primary} />
              ))}
              {ride.comment ? <T v="small" muted style={{ flex: 1 }}>« {ride.comment} »</T> : null}
            </Row>
          ) : (
            <>
              <Row gap={4}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i + 1} étoile${i ? 's' : ''}`} onPress={() => setStars(i + 1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={i < stars ? 'star' : 'star-outline'} size={32} color={t.primary} />
                  </Pressable>
                ))}
              </Row>
              <Field label="Commentaire (optionnel)" value={comment} onChangeText={setComment} multiline />
              <Button
                title="Envoyer l’évaluation"
                disabled={!stars}
                onPress={() => {
                  updateRide(ride.id, { rating: stars, comment: comment.trim() || undefined }, `Évaluée ${stars}/5`);
                  toast('Merci pour votre retour', 'success');
                }}
              />
            </>
          )}
        </Card>
      ) : null}

      <Section title="Un problème ?">
        {ride.dispute ? (
          <Banner
            kind={ride.dispute.status === 'open' ? 'warning' : 'success'}
            title={ride.dispute.status === 'open' ? 'Réclamation en cours' : 'Réclamation résolue'}
            text={`${ride.dispute.reason}${ride.dispute.note ? ' — ' + ride.dispute.note : ''}`}
          />
        ) : (
          <Card>
            <T v="small" muted>
              Signalez un souci : l’équipe traite chaque demande à l’amiable (geste commercial, remboursement partiel…).
            </T>
            <Row wrap>
              {REASONS.map((r) => (
                <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
              ))}
            </Row>
            <Button
              title="Ouvrir une réclamation"
              kind="secondary"
              icon="chatbubbles"
              disabled={!reason}
              onPress={() => {
                updateRide(ride.id, { dispute: { reason: reason!, status: 'open', at: Date.now() } }, 'Réclamation ouverte');
                toast('Réclamation enregistrée', 'success');
              }}
            />
          </Card>
        )}
      </Section>

      <Section title="Historique">
        <Card>
          {ride.events.map((e, i) => (
            <Row key={i} style={{ justifyContent: 'space-between' }}>
              <T v="small">{e.label}</T>
              <T v="small" muted>
                {fmtTime(e.at)}
              </T>
            </Row>
          ))}
        </Card>
      </Section>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
