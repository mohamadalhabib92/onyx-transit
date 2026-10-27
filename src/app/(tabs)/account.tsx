import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Card, Field, ListItem, Screen, Section, Segmented, T, useToast } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { PAYMENT_LABEL, store, type Role } from '@/state';

export default function Account() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const s = store.use();
  const [p, setP] = useState(s.profile);
  const dirty = JSON.stringify(p) !== JSON.stringify(s.profile);
  return (
    <Screen>
      <T v="h1">Compte</T>
      <Card>
        <Field label="Nom" value={p.name} onChangeText={(v) => setP({ ...p, name: v })} />
        <Field label="E-mail" value={p.email} onChangeText={(v) => setP({ ...p, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Téléphone" value={p.phone} onChangeText={(v) => setP({ ...p, phone: v })} keyboardType="phone-pad" />
        <Field label="Société (facturation)" value={p.company} onChangeText={(v) => setP({ ...p, company: v })} hint="Requis pour le paiement sur facture entreprise." />
        <Button
          title="Enregistrer"
          disabled={!dirty}
          onPress={() => {
            store.set((x) => ({ ...x, profile: p }));
            toast('Profil enregistré', 'success');
          }}
        />
      </Card>
      <Section title="Rôle principal (démo)">
        <Segmented<Role>
          options={[
            { key: 'client', label: 'Client' },
            { key: 'chauffeur', label: 'Chauffeur' },
            { key: 'admin', label: 'Admin' },
          ]}
          value={s.role}
          onChange={(r) => store.set((x) => ({ ...x, role: r }))}
        />
        <T v="small" muted>
          En démo locale, les trois espaces restent accessibles. En production, les droits sont attribués côté serveur.
        </T>
      </Section>
      <Card>
        <ListItem icon="card" title="Paiement" sub={PAYMENT_LABEL[s.payment]} onPress={() => router.push('/payments')} />
        <ListItem icon="lock-closed" title="Confidentialité & données" sub="Consentements, export, suppression" onPress={() => router.push('/privacy')} />
        <ListItem icon="help-buoy" title="Assistance" sub="FAQ, contact, urgences" onPress={() => router.push('/support')} />
      </Card>
      <Button
        title="Se déconnecter"
        kind="secondary"
        icon="log-out"
        onPress={() => {
          store.set((x) => ({ ...x, signedIn: false }));
          router.replace('/welcome');
        }}
      />
      <T v="small" muted center>
        Onyx Transit · v1.0 · données stockées localement
      </T>
    </Screen>
  );
}
