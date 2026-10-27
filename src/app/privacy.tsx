import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Banner, Button, Card, IconButton, Row, Screen, Section, Sheet, T, ToggleRow, useToast } from '@/kit/ui';
import { exportText } from '@/kit/files';
import { fmtDateTime } from '@/kit/format';
import { store } from '@/state';

const BASES = [
  ['Compte et courses', 'Exécution du contrat', 'Durée du compte + 10 ans pour les pièces comptables (reçus)'],
  ['Position GPS', 'Consentement (révocable)', 'Le temps de la course uniquement ; non conservée ensuite'],
  ['Évaluations & réclamations', 'Intérêt légitime (qualité de service)', '3 ans'],
  ['Offres commerciales', 'Consentement (révocable)', 'Jusqu’au retrait du consentement'],
  ['Documents chauffeur', 'Obligation légale (transport professionnel de personnes)', 'Durée de l’activité + délai légal'],
];

export default function Privacy() {
  const router = useRouter();
  const toast = useToast();
  const s = store.use();
  const [confirm, setConfirm] = useState(false);
  const setConsent = (k: 'location' | 'marketing', v: boolean) => store.set((x) => ({ ...x, consents: { ...x.consents, [k]: v, at: Date.now() } }));
  return (
    <Screen>
      <Row>
        <IconButton icon="chevron-back" a11y="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <T v="h2">Confidentialité</T>
      </Row>
      <Banner kind="info" text="Conforme aux principes RGPD (UE) et nLPD (Suisse) : minimisation, finalités explicites, droits d’accès, de portabilité et d’effacement. Responsable du traitement : à compléter (YOUR_COMPANY_LEGAL_NAME)." />
      {s.signedIn ? (
        <Section title="Mes consentements">
          <Card>
            <ToggleRow label="Localisation GPS" sub="Pré-remplir le départ" value={s.consents.location} onChange={(v) => setConsent('location', v)} />
            <ToggleRow label="Offres commerciales" value={s.consents.marketing} onChange={(v) => setConsent('marketing', v)} />
            <T v="small" muted>
              Dernière mise à jour : {s.consents.at ? fmtDateTime(s.consents.at) : '—'}
            </T>
          </Card>
        </Section>
      ) : null}
      <Section title="Bases légales et conservation">
        {BASES.map(([what, base, keep]) => (
          <Card key={what}>
            <T v="h3">{what}</T>
            <T v="small">Base : {base}</T>
            <T v="small" muted>
              Conservation : {keep}
            </T>
          </Card>
        ))}
      </Section>
      <Section title="Politique de confidentialité (résumé)">
        <Card>
          <T v="small">
            Nous traitons vos données uniquement pour organiser vos courses, les facturer, assurer la sécurité et répondre à vos demandes. Elles ne sont jamais vendues. Dans cette version, toutes les données restent sur votre appareil. Lorsque le service en ligne sera activé, l’hébergement, les sous-traitants (paiement, cartographie) et les transferts hors de Suisse/UE seront listés ici. Contact délégué à la protection des données : YOUR_DPO_EMAIL.
          </T>
        </Card>
      </Section>
      {s.signedIn ? (
        <Section title="Mes droits">
          <Button
            title="Exporter mes données (JSON)"
            kind="secondary"
            icon="download"
            onPress={() => exportText('onyx-mes-donnees.json', JSON.stringify({ exportedAt: new Date().toISOString(), ...s }, null, 2), 'application/json')}
          />
          <Button title="Supprimer mon compte et mes données" kind="danger" icon="trash" onPress={() => setConfirm(true)} />
        </Section>
      ) : null}
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Supprimer le compte ?">
        <T>Toutes vos données (profil, trajets, reçus, documents) seront effacées de cet appareil. Action irréversible.</T>
        <Button
          title="Oui, tout supprimer"
          kind="danger"
          onPress={async () => {
            setConfirm(false);
            await store.reset();
            toast('Compte supprimé', 'success');
            router.replace('/welcome');
          }}
        />
        <Button title="Annuler" kind="secondary" onPress={() => setConfirm(false)} />
      </Sheet>
    </Screen>
  );
}
