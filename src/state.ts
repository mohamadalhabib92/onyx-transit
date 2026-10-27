import { createPersistedStore, uid } from '@/kit/store';
import type { CategoryId, LatLon } from '@/lib/pricing';
import type { City } from '@/data/places';

export type Role = 'client' | 'chauffeur' | 'admin';
export type RideStatus = 'requested' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentKind = 'card_stripe' | 'apple_pay' | 'google_pay' | 'invoice' | 'simulated';

export type Stop = LatLon & { label: string };
export type Ride = {
  id: string;
  createdAt: number;
  pickup: Stop;
  dropoff: Stop;
  category: CategoryId;
  km: number;
  minutes: number;
  price: number;
  currency: string;
  status: RideStatus;
  /** true = la progression est simulée automatiquement (démo étiquetée) */
  simulated: boolean;
  /** true = course créée pour tester (générée côté chauffeur/admin) */
  demo: boolean;
  progress: number; // 0..1 pour l’animation
  payment: PaymentKind;
  paymentStatus: 'pending' | 'simulated_paid' | 'not_configured';
  rating?: number;
  comment?: string;
  driverName?: string;
  events: { at: number; label: string }[];
  dispute?: { reason: string; status: 'open' | 'resolved'; at: number; note?: string };
};

export type DocStatus = 'missing' | 'uploaded_placeholder' | 'validated_demo';
export type Consents = { terms: boolean; privacy: boolean; location: boolean; marketing: boolean; at?: number };

export type AppState = {
  signedIn: boolean;
  profile: { name: string; email: string; phone: string; company: string };
  role: Role;
  consents: Consents;
  payment: PaymentKind;
  rides: Ride[];
  driver: { online: boolean; sessionStart?: number; sessionEarnings: number; docs: Record<string, DocStatus>; refused: string[] };
  cities: Record<City['id'], boolean>;
  aiDispatch: boolean;
  autoSim: boolean;
};

export const DRIVER_DOCS = [
  { id: 'permis', label: 'Permis de conduire (cat. B, ≥ 3 ans)' },
  { id: 'carte_pro', label: 'Carte professionnelle chauffeur (Genève)' },
  { id: 'assurance', label: 'Assurance responsabilité transport de personnes' },
  { id: 'permis_circulation', label: 'Permis de circulation du véhicule' },
  { id: 'casier', label: 'Extrait du casier judiciaire' },
];

export const store = createPersistedStore<AppState>(
  'onyx-transit',
  () => ({
    signedIn: false,
    profile: { name: '', email: '', phone: '', company: '' },
    role: 'client',
    consents: { terms: false, privacy: false, location: false, marketing: false },
    payment: 'simulated',
    rides: [],
    driver: { online: false, sessionEarnings: 0, docs: Object.fromEntries(DRIVER_DOCS.map((d) => [d.id, 'missing'])) as Record<string, DocStatus>, refused: [] },
    cities: { geneve: true, paris: false, casablanca: false },
    aiDispatch: false,
    autoSim: true,
  }),
  1
);

export const STATUS_LABEL: Record<RideStatus, string> = {
  requested: 'Recherche d’un chauffeur',
  accepted: 'Chauffeur en route',
  arriving: 'Chauffeur arrivé',
  in_progress: 'Course en cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export const PAYMENT_LABEL: Record<PaymentKind, string> = {
  card_stripe: 'Carte bancaire (Stripe)',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  invoice: 'Facture entreprise',
  simulated: 'Paiement simulé (démo)',
};

/** Commission plateforme utilisée pour le calcul indicatif des gains chauffeur (démo). */
export const DRIVER_SHARE = 0.8;

export function updateRide(id: string, patch: Partial<Ride> | ((r: Ride) => Partial<Ride>), event?: string) {
  store.set((s) => ({
    ...s,
    rides: s.rides.map((r) => {
      if (r.id !== id) return r;
      const p = typeof patch === 'function' ? patch(r) : patch;
      return { ...r, ...p, events: event ? [...r.events, { at: Date.now(), label: event }] : r.events };
    }),
  }));
}

export function activeRide(s: AppState): Ride | undefined {
  return s.rides.find((r) => !r.demo && ['requested', 'accepted', 'arriving', 'in_progress'].includes(r.status));
}

export function newRide(input: Omit<Ride, 'id' | 'createdAt' | 'status' | 'progress' | 'events' | 'paymentStatus'>): Ride {
  return {
    ...input,
    id: uid('ride_'),
    createdAt: Date.now(),
    status: 'requested',
    progress: 0,
    paymentStatus: input.payment === 'simulated' ? 'pending' : 'not_configured',
    events: [{ at: Date.now(), label: 'Demande envoyée' }],
  };
}

/** Avance d’une étape (utilisé par le simulateur et par l’espace chauffeur). */
export function advanceRide(id: string, driverName = 'Chauffeur Onyx') {
  const r = store.get().rides.find((x) => x.id === id);
  if (!r) return;
  switch (r.status) {
    case 'requested':
      return updateRide(id, { status: 'accepted', driverName, progress: 0 }, `Acceptée par ${driverName}`);
    case 'accepted':
      return updateRide(id, { status: 'arriving', progress: 1 }, 'Chauffeur arrivé au point de prise en charge');
    case 'arriving':
      return updateRide(id, { status: 'in_progress', progress: 0 }, 'Course démarrée');
    case 'in_progress': {
      updateRide(id, { status: 'completed', progress: 1, paymentStatus: r.payment === 'simulated' ? 'simulated_paid' : 'not_configured' }, 'Course terminée');
      const s = store.get();
      if (s.driver.online && !r.simulated) {
        store.set((x) => ({ ...x, driver: { ...x.driver, sessionEarnings: x.driver.sessionEarnings + r.price * DRIVER_SHARE } }));
      }
      return;
    }
  }
}
