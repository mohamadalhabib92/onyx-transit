import React from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { Banner, Button, Card, IconButton, Row, Screen, Section, T } from '@/kit/ui';
import { isConfigured } from '@/kit/config';
import { ENV } from '@/config';

const FAQ = [
  ['Comment est calculé le prix ?', 'Un prix maximum est affiché avant la confirmation (simulation : distance × 1,3). Il est horodaté et ne peut pas être dépassé sans un nouveau prix accepté. La grille réelle est YOUR_TARIFF_TABLE — à valider.'],
  ['Puis-je annuler ?', 'Oui. Les frais dépendent de YOUR_FREE_CANCEL_HOURS, non renseigné : ils ne sont pas calculés (à valider).'],
  ['Objet oublié ?', 'Ouvrez le trajet concerné dans « Trajets » puis « Signaler un problème » → « Objet oublié ».'],
  ['Mes données ?', 'Compte → Confidentialité : consentements, export et suppression.'],
];

export default function Support() {
  const router = useRouter();
  return (
    <Screen>
      <Row>
        <IconButton icon="chevron-back" a11y="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/account'))} />
        <T v="h2">Assistance</T>
      </Row>
      <Banner kind="danger" title="Urgence en Suisse" text="Police 117 · Ambulance 144 · Numéro européen 112." action={<Button small kind="danger" title="Appeler le 112" icon="call" onPress={() => Linking.openURL('tel:112').catch(() => {})} />} />
      <Section title="Questions fréquentes">
        {FAQ.map(([q, a]) => (
          <Card key={q}>
            <T v="h3">{q}</T>
            <T v="small" muted>
              {a}
            </T>
          </Card>
        ))}
      </Section>
      <Section title="Nous contacter">
        <Card>
          <T v="small" muted>
            {isConfigured(ENV.supportEmail)
              ? `Écrire à ${ENV.supportEmail}. Les réclamations sur une course se font aussi depuis son reçu.`
              : 'Canal de support non configuré : renseignez YOUR_SUPPORT_EMAIL. Les réclamations sur une course se font depuis son reçu.'}
          </T>
          {isConfigured(ENV.supportEmail) ? (
            <Button title="Écrire au support" kind="secondary" icon="mail" onPress={() => Linking.openURL(`mailto:${ENV.supportEmail}`).catch(() => {})} />
          ) : null}
        </Card>
      </Section>
    </Screen>
  );
}
