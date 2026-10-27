import { isConfigured, type ConfigEntry } from '@/kit/config';

/**
 * Configuration publique (EXPO_PUBLIC_*). Seules des valeurs PUBLIQUES vont ici.
 * La clé secrète Stripe (YOUR_STRIPE_SECRET_KEY) reste côté serveur — jamais dans l’app.
 */
export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'YOUR_SUPABASE_URL',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_SUPABASE_ANON_KEY',
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? 'YOUR_STRIPE_PUBLISHABLE_KEY',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'YOUR_API_BASE_URL',
};

export const CONFIG: ConfigEntry[] = [
  { name: 'EXPO_PUBLIC_SUPABASE_URL', value: ENV.supabaseUrl, note: 'Comptes et synchronisation multi-appareils' },
  { name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', value: ENV.supabaseAnonKey, secret: true, note: 'Clé publique (anon) — protégée par RLS' },
  { name: 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', value: ENV.stripePublishableKey, secret: true, note: 'Paiement carte (clé publiable uniquement)' },
  { name: 'EXPO_PUBLIC_API_BASE_URL', value: ENV.apiBaseUrl, note: 'Backend cible (dispatch, paiements serveur)' },
  { name: 'YOUR_STRIPE_SECRET_KEY', value: 'YOUR_STRIPE_SECRET_KEY', secret: true, phase: 'Serveur uniquement', note: 'Ne jamais mettre dans l’app ni en EXPO_PUBLIC_' },
];

export const backendReady = isConfigured(ENV.supabaseUrl) && isConfigured(ENV.supabaseAnonKey);
export const stripeReady = isConfigured(ENV.stripePublishableKey) && isConfigured(ENV.apiBaseUrl);
