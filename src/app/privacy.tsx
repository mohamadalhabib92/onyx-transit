import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Banner, Button, Card, IconButton, Row, Screen, Section, Sheet, T, ToggleRow, useToast } from '@/kit/ui';
import { exportText } from '@/kit/files';
import { fmtDateTime } from '@/kit/format';
import { LOCAL_COORDINATE_RETENTION } from '@/lib/location-copy';
import { store } from '@/state';

const BASES = [
  ['Compte et courses', 'Exécution du contrat', 'Durée du compte + 10 ans pour les pièces comptables (reçus)'],
  ['Lieux et coordonnées des courses', 'Enregistrement sur cet appareil', LOCAL_COORDINATE_RETENTION],
  ['Évaluations & réclamations', 'Intérêt légitime (qualité de service)', '3 ans'],
  ['Offres commerciales', 'Consentement (révocable)', 'Jusqu’au retrait du consentement'],
  ['Documents chauffeur', 'Obligation légale (transport professionnel de personnes)', 'Durée de l’activité + délai légal'],
];

export default function Privacy() {
  const router = useRouter();
  const toast = useToast();
  const s = store.use();
  const [confirm, setConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const setConsent = (k: 'location' | 'marketing', v: boolean) => store.set((x) => ({ ...x, consents: { ...x.consents, [k]: v, at: Date.now() } }));
  return (
    <Screen>
      <Row>
        <IconButton icon="chevron-back" a11y="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <T v="h2">Confidentialité</T>
      </Row>
      <Banner kind="info" text="nLPD (Suisse) d’abord ; RGPD en plus pour les clients de l’UE. Minimisation, finalités, accès, portabilité et effacement. Responsable : YOUR_COMPANY_LEGAL_NAME. Texte à valider." />
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
            Nous traitons vos données uniquement pour organiser vos courses, les facturer, assurer la sécurité et répondre à vos demandes. Elles ne sont jamais vendues. Dans cette version, toutes les données restent sur votre appareil. {LOCAL_COORDINATE_RETENTION} La lecture GPS, si vous l’autorisez, sert seulement à proposer un départ ; elle n’est pas un suivi continu. Aucun compte en ligne n’est connecté. Ce texte décrit ce comportement. Il n’est pas une décision juridique ni une autorisation de transport. Contact délégué à la protection des données : YOUR_DPO_EMAIL.
          </T>
        </Card>
      </Section>
      {s.signedIn ? (
        <Section title="Mes droits">
          <Button
            title="Exporter la copie brute locale"
            kind="secondary"
            icon="download"
            onPress={async () => {
              const raw = await store.readRaw();
              if (raw == null) {
                toast('Aucune copie brute stockée sur cet appareil', 'info');
                return;
              }
              await exportText('onyx-brut-local.json', raw, 'application/json');
              toast('Copie brute locale produite. Rien n’est envoyé à un serveur.', 'success');
            }}
          />
          <T v="small" muted>
            Le fichier est le JSON stocké sous la clé locale, octets tels quels, y compris les champs inconnus. Sur le web il est téléchargé. Sur mobile, la feuille de partage s’ouvre : rien ne part tant que vous ne choisissez pas une destination. Ce n’est pas une sauvegarde de l’appareil.
          </T>
          <Button
            title="Supprimer mon compte et mes données"
            kind="danger"
            icon="trash"
            onPress={() => {
              setDeleteError(null);
              setConfirm(true);
            }}
          />
        </Section>
      ) : null}
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Supprimer le compte ?">
        <T>
          La clé locale est effacée seulement après une copie brute vérifiée : mêmes octets, empreinte SHA-256, restauration dans une clé isolée puis effacement de cette clé isolée. La copie reste sur cet appareil. Ce n’est pas une sauvegarde du téléphone, ni une copie serveur. La clé active n’est pas restaurée : une bascule future reste à décider.
        </T>
        {deleteError ? <Banner kind="danger" title="Suppression annulée" text={deleteError} /> : null}
        <Button
          title="Oui, copier puis effacer la clé active"
          kind="danger"
          onPress={async () => {
            try {
              const result = await store.reset();
              setConfirm(false);
              if (result.proof) {
                toast(`Copie ${result.proof.backupKey} · ${result.proof.rides ?? '—'} courses · ${result.proof.bytes} octets`, 'success');
              } else {
                toast('Aucune donnée stockée à copier', 'success');
              }
              router.replace('/welcome');
            } catch (err) {
              setDeleteError(err instanceof Error ? err.message : 'Suppression annulée. L’original n’a pas été effacé.');
            }
          }}
        />
        <Button title="Annuler" kind="secondary" onPress={() => setConfirm(false)} />
      </Sheet>
    </Screen>
  );
}
