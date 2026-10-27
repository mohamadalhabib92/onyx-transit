import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Button, Card, Field, Ionicons, Row, Screen, T } from '@/kit/ui';
import { alpha, useTheme } from '@/kit/theme';
import { store } from '@/state';
import { backendReady } from '@/config';

function Check({ value, onChange, label, required }: { value: boolean; onChange: (v: boolean) => void; label: string; required?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44, paddingVertical: 4 }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: value ? t.primary : t.border, backgroundColor: value ? t.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {value ? <Ionicons name="checkmark" size={16} color={t.primaryText} /> : null}
      </View>
      <T v="small" style={{ flex: 1 }}>
        {label}
        {required ? <T v="small" color={t.primary}> *</T> : null}
      </T>
    </Pressable>
  );
}

export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [c, setC] = useState({ terms: false, privacy: false, location: false, marketing: false });
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canGo = name.trim().length >= 2 && emailOk && c.terms && c.privacy;

  const submit = () => {
    store.set((s) => ({ ...s, signedIn: true, profile: { ...s.profile, name: name.trim(), email: email.trim(), phone: phone.trim() }, consents: { ...c, at: Date.now() } }));
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <View style={{ paddingTop: 28, paddingBottom: 8, gap: 10, alignItems: 'center' }}>
        <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: alpha(t.primary, 0.15), borderWidth: 1, borderColor: alpha(t.primary, 0.5), alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="car-sport" size={38} color={t.primary} />
        </View>
        <T v="display" center>
          Onyx Transit
        </T>
        <T muted center>
          Chauffeur privé premium à Genève. Réservez, suivez, réglez — en toute discrétion.
        </T>
      </View>

      {!backendReady ? (
        <Banner
          kind="info"
          title="Compte local sur cet appareil"
          text="Le service de comptes (Supabase) n’est pas configuré (YOUR_SUPABASE_URL). Votre profil est enregistré uniquement sur cet appareil ; rien n’est envoyé."
        />
      ) : null}

      <Card>
        <T v="h3">Créer mon profil</T>
        <Field label="Nom complet" value={name} onChangeText={setName} placeholder="Prénom Nom" autoComplete="name" />
        <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="vous@exemple.ch" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={email && !emailOk ? 'Adresse e-mail invalide' : undefined} />
        <Field label="Téléphone (optionnel)" value={phone} onChangeText={setPhone} placeholder="+41 …" keyboardType="phone-pad" hint="Utilisé seulement pour que le chauffeur puisse vous joindre." />
      </Card>

      <Card>
        <T v="h3">Consentements (RGPD / nLPD)</T>
        <Check required value={c.terms} onChange={(v) => setC({ ...c, terms: v })} label="J’accepte les conditions d’utilisation." />
        <Check required value={c.privacy} onChange={(v) => setC({ ...c, privacy: v })} label="J’ai lu la politique de confidentialité (traitement nécessaire à l’exécution du contrat)." />
        <Check value={c.location} onChange={(v) => setC({ ...c, location: v })} label="Autoriser la localisation GPS pour la prise en charge (facultatif, révocable)." />
        <Check value={c.marketing} onChange={(v) => setC({ ...c, marketing: v })} label="Recevoir des offres Onyx (facultatif, révocable)." />
        <Button title="Lire la politique de confidentialité" kind="ghost" small onPress={() => router.push('/privacy')} />
      </Card>

      <Button title="Continuer" icon="arrow-forward" disabled={!canGo} onPress={submit} full />
      <Row style={{ justifyContent: 'center' }}>
        <T v="small" muted center>
          * obligatoires. Vous pourrez exporter ou supprimer vos données à tout moment.
        </T>
      </Row>
    </Screen>
  );
}
