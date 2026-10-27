import React from 'react';
import { useRouter } from 'expo-router';
import { Badge, Banner, Card, IconButton, ListItem, Row, Screen, T, useToast, Ionicons } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { PAYMENT_LABEL, store, type PaymentKind } from '@/state';
import { stripeReady } from '@/config';

export default function Payments() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const s = store.use();
  const methods: { k: PaymentKind; icon: React.ComponentProps<typeof Ionicons>['name']; sub: string; enabled: boolean; badge?: string }[] = [
    { k: 'simulated', icon: 'flask', sub: 'Aucun débit — pour tester le parcours complet', enabled: true, badge: 'Démo' },
    { k: 'card_stripe', icon: 'card', sub: stripeReady ? 'Carte enregistrée via Stripe' : 'Configuration manquante : YOUR_STRIPE_PUBLISHABLE_KEY + backend (YOUR_API_BASE_URL)', enabled: stripeReady, badge: stripeReady ? undefined : 'Non configuré' },
    { k: 'apple_pay', icon: 'logo-apple', sub: 'Prévu en Phase 1.1 (via Stripe)', enabled: false, badge: 'Phase 1.1' },
    { k: 'google_pay', icon: 'logo-google', sub: 'Prévu en Phase 1.1 (via Stripe)', enabled: false, badge: 'Phase 1.1' },
    { k: 'invoice', icon: 'business', sub: s.profile.company ? `Facturation mensuelle — ${s.profile.company}` : 'Renseignez votre société dans Compte', enabled: !!s.profile.company },
  ];
  return (
    <Screen>
      <Row>
        <IconButton icon="chevron-back" a11y="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/account'))} />
        <T v="h2">Moyens de paiement</T>
      </Row>
      <Banner kind="info" text="Aucune donnée de carte n’est stockée par l’app. Le paiement par carte passera par Stripe (clé publiable côté app, clé secrète uniquement sur le serveur)." />
      <Card>
        {methods.map((m) => (
          <ListItem
            key={m.k}
            icon={m.icon}
            iconColor={m.enabled ? t.primary : t.textMuted}
            title={PAYMENT_LABEL[m.k]}
            sub={m.sub}
            right={
              s.payment === m.k ? (
                <Ionicons name="checkmark-circle" size={22} color={t.success} />
              ) : m.badge ? (
                <Badge label={m.badge} color={m.enabled ? t.accent : t.textMuted} />
              ) : undefined
            }
            onPress={() => {
              if (!m.enabled) return toast(m.sub, 'info');
              store.set((x) => ({ ...x, payment: m.k }));
              toast('Moyen de paiement sélectionné', 'success');
            }}
          />
        ))}
      </Card>
    </Screen>
  );
}
