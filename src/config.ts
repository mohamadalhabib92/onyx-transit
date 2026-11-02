import { isConfigured, type ConfigEntry } from '@/kit/config';

/**
 * Configuration publique (EXPO_PUBLIC_*). Seules des valeurs PUBLIQUES vont ici.
 * La clé secrète Stripe, la clé cartes et toute clé ASC restent hors de l’app.
 * EXPO_PUBLIC_EXAMPLE_EN n’est pas lu : une ancienne valeur « test » est ignorée.
 */
const ignoredExample = process.env.EXPO_PUBLIC_EXAMPLE_EN;

export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'YOUR_SUPABASE_URL',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_SUPABASE_ANON_KEY',
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? 'YOUR_STRIPE_PUBLISHABLE_KEY',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'YOUR_API_BASE_URL',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? 'YOUR_SENTRY_DSN',
  companyLegalName: process.env.EXPO_PUBLIC_COMPANY_LEGAL_NAME ?? 'YOUR_COMPANY_LEGAL_NAME',
  vatNumber: process.env.EXPO_PUBLIC_VAT_NUMBER ?? 'YOUR_VAT_NUMBER',
  dpoEmail: process.env.EXPO_PUBLIC_DPO_EMAIL ?? 'YOUR_DPO_EMAIL',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'YOUR_SUPPORT_EMAIL',
  tariffTable: process.env.EXPO_PUBLIC_TARIFF_TABLE ?? 'YOUR_TARIFF_TABLE',
  freeCancelHours: process.env.EXPO_PUBLIC_FREE_CANCEL_HOURS ?? 'YOUR_FREE_CANCEL_HOURS',
  airportFreeWaitMin: process.env.EXPO_PUBLIC_AIRPORT_FREE_WAIT_MIN ?? 'YOUR_AIRPORT_FREE_WAIT_MIN',
  otr2Limits: process.env.EXPO_PUBLIC_OTR2_LIMITS ?? 'YOUR_OTR2_LIMITS',
  operatingModel: process.env.EXPO_PUBLIC_OPERATING_MODEL ?? 'YOUR_OPERATING_MODEL',
  locationRetentionDays: process.env.EXPO_PUBLIC_LOCATION_RETENTION_DAYS ?? 'YOUR_LOCATION_RETENTION_DAYS',
  mapsProvider: process.env.EXPO_PUBLIC_MAPS_PROVIDER ?? 'YOUR_MAPS_PROVIDER',
  cityParis: process.env.EXPO_PUBLIC_CITY_PARIS === 'true',
  cityCasablanca: process.env.EXPO_PUBLIC_CITY_CASABLANCA === 'true',
  featureTwint: process.env.EXPO_PUBLIC_FEATURE_TWINT === 'true',
  featureAiDispatch: process.env.EXPO_PUBLIC_FEATURE_AI_DISPATCH === 'true',
};

/** Vrai seulement si quelqu’un a encore défini l’ancienne variable de test. Elle ne change aucun comportement. */
export const staleExampleEnv = Boolean(ignoredExample);

export const CONFIG: ConfigEntry[] = [
  { name: 'EXPO_PUBLIC_SUPABASE_URL', value: ENV.supabaseUrl, note: 'Comptes et synchronisation multi-appareils' },
  { name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', value: ENV.supabaseAnonKey, secret: true, note: 'Clé publique (anon) — protégée par RLS' },
  { name: 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', value: ENV.stripePublishableKey, secret: true, note: 'Paiement carte (clé publiable uniquement)' },
  { name: 'EXPO_PUBLIC_API_BASE_URL', value: ENV.apiBaseUrl, note: 'Backend cible (dispatch, paiements serveur). clover-maritime non repris.' },
  { name: 'EXPO_PUBLIC_SENTRY_DSN', value: ENV.sentryDsn, secret: true, note: 'Journal de crash. Désactivé si YOUR_SENTRY_DSN.' },
  { name: 'EXPO_PUBLIC_COMPANY_LEGAL_NAME', value: ENV.companyLegalName, note: 'Raison sociale du reçu — à valider' },
  { name: 'EXPO_PUBLIC_VAT_NUMBER', value: ENV.vatNumber, note: 'N° TVA affiché seulement s’il est renseigné' },
  { name: 'EXPO_PUBLIC_DPO_EMAIL', value: ENV.dpoEmail, note: 'Contact protection des données' },
  { name: 'EXPO_PUBLIC_SUPPORT_EMAIL', value: ENV.supportEmail, note: 'Support' },
  { name: 'EXPO_PUBLIC_TARIFF_TABLE', value: ENV.tariffTable, note: 'Grille réelle. La formule distance × 1,3 reste une simulation.' },
  { name: 'EXPO_PUBLIC_FREE_CANCEL_HOURS', value: ENV.freeCancelHours, note: 'Délai d’annulation gratuite — à valider' },
  { name: 'EXPO_PUBLIC_AIRPORT_FREE_WAIT_MIN', value: ENV.airportFreeWaitMin, note: 'Attente aéroport offerte — à valider' },
  { name: 'EXPO_PUBLIC_OTR2_LIMITS', value: ENV.otr2Limits, note: 'Minutes de conduite max. Vide ou YOUR_* = non appliqué, à valider.' },
  { name: 'EXPO_PUBLIC_OPERATING_MODEL', value: ENV.operatingModel, note: 'Modèle d’exploitation — décision de Mohamed avec un avocat' },
  { name: 'EXPO_PUBLIC_LOCATION_RETENTION_DAYS', value: ENV.locationRetentionDays, note: 'Durée de conservation des positions' },
  { name: 'EXPO_PUBLIC_MAPS_PROVIDER', value: ENV.mapsProvider, note: 'Fournisseur de cartes. La clé YOUR_MAPS_API_KEY reste côté serveur.' },
  { name: 'YOUR_STRIPE_SECRET_KEY', value: 'YOUR_STRIPE_SECRET_KEY', secret: true, phase: 'Serveur uniquement', note: 'Ne jamais mettre dans l’app ni en EXPO_PUBLIC_' },
  { name: 'YOUR_MAPS_API_KEY', value: 'YOUR_MAPS_API_KEY', secret: true, phase: 'Serveur uniquement', note: 'Géocodage et ETA. Jamais dans le client.' },
  { name: 'YOUR_SWISS_IBAN', value: 'YOUR_SWISS_IBAN', secret: true, phase: 'Serveur / facture', note: 'QR-facture. Pas encore utilisé (Passe 5).' },
  { name: 'CITY_PARIS', value: ENV.cityParis ? 'true' : 'false', note: 'Désactivé par défaut. Cadre légal à étudier.' },
  { name: 'CITY_CASABLANCA', value: ENV.cityCasablanca ? 'true' : 'false', note: 'Désactivé par défaut. Cadre légal à étudier.' },
  { name: 'FEATURE_TWINT', value: ENV.featureTwint ? 'true' : 'false', phase: 'Phase 2', note: 'Paiement TWINT' },
  { name: 'FEATURE_AI_DISPATCH', value: ENV.featureAiDispatch ? 'true' : 'false', phase: 'Phase 3', note: 'Ne bloque jamais le parcours de course' },
];

export const backendReady = isConfigured(ENV.supabaseUrl) && isConfigured(ENV.supabaseAnonKey);
export const stripeReady = isConfigured(ENV.stripePublishableKey) && isConfigured(ENV.apiBaseUrl);
export const vatReady = isConfigured(ENV.vatNumber);
export const companyReady = isConfigured(ENV.companyLegalName);

/** Paris et Casablanca ne s’ouvrent que si le flag d’environnement est explicitement true. */
export function cityOpen(id: 'geneve' | 'paris' | 'casablanca', localEnabled: boolean): boolean {
  if (id === 'geneve') return true;
  if (id === 'paris') return ENV.cityParis && localEnabled;
  return ENV.cityCasablanca && localEnabled;
}
