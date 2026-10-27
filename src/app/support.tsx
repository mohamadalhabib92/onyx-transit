import React from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Button, Card, IconButton, Row, Screen, Section, T } from '@/kit/ui';

const FAQ = [
  ['Comment est calculé le prix ?', 'Une prise en charge, un prix au kilomètre et à la minute selon la catégorie, avec un minimum de course. L’estimation est affichée avant la commande.'],
  ['Puis-je annuler ?', 'Oui, sans frais tant que le chauffeur n’est pas arrivé (politique à confirmer par l’opérateur).'],
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
            Canal de support non configuré : renseignez l’adresse de l’opérateur (YOUR_SUPPORT_EMAIL) avant le lancement. Les réclamations sur une course se font depuis son reçu.
          </T>
        </Card>
      </Section>
    </Screen>
  );
}
