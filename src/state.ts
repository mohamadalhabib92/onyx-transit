import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersistedStore, IncompatibleStoredState, uid } from '@/kit/store';
import { publishLostRides, type LostRide } from '@/lib/lost-rides';
import { CATEGORIES, type CategoryId, type LatLon } from '@/lib/pricing';
import { assessDocs, canAssign, capToMaximum, parseOtrMaxMinutes, type DocDef, type DocIssue } from '@/lib/rules';
import type { City } from '@/data/places';
import { ENV } from '@/config';

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
  /** Plafond annoncé. Absent sur d’anciennes courses : le prix enregistré fait foi. */
  priceMaximum?: number;
  /** Horodatage du prix maximum (preuve). */
  quotedAt?: number;
  /** Prix facturé, toujours ≤ prix maximum. */
  priceCharged?: number;
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
  driverVtcCard?: string;
  plateLabel?: string;
  /** Chauffeur désigné par l’admin (dispatch manuel). */
  assignedDriverId?: string | null;
  events: { at: number; label: string }[];
  dispute?: { reason: string; status: 'open' | 'resolved'; at: number; note?: string };
};

export type DocStatus = 'missing' | 'uploaded_placeholder' | 'validated_demo';
export type Consents = { terms: boolean; privacy: boolean; location: boolean; marketing: boolean; at?: number };

export type JournalKind = 'quote' | 'status' | 'assign' | 'price' | 'doc' | 'dispatch_blocked' | 'other';
export type JournalEntry = { id: string; at: number; rideId?: string; kind: JournalKind; label: string };

export type AppState = {
  signedIn: boolean;
  profile: { name: string; email: string; phone: string; company: string };
  role: Role;
  consents: Consents;
  payment: PaymentKind;
  rides: Ride[];
  /** Journal append-only. Jamais réécrit entrée par entrée. */
  journal: JournalEntry[];
  /** Hypothèse de démo, éditable par l’admin, masquée au client. */
  driverShareDemo: number;
  driver: {
    online: boolean;
    sessionStart?: number;
    sessionEarnings: number;
    docs: Record<string, DocStatus>;
    docExpiry: Record<string, string | null>;
    refused: string[];
    vehicleCategory: CategoryId | null;
    vehicleSeats: number | null;
    vtcCardNumber: string;
    plateLabel: string;
    drivingMinutes: number;
  };
  cities: Record<City['id'], boolean>;
  aiDispatch: boolean;
  autoSim: boolean;
};

export type DocInfo = DocDef & { group: 'driver' | 'vehicle' };

export const DRIVER_DOCS: DocInfo[] = [
  { id: 'permis', label: 'Permis de conduire B121', group: 'driver', required: true },
  { id: 'carte_pro', label: 'Carte professionnelle VTC (Genève)', group: 'driver', required: true },
  { id: 'identite', label: 'Pièce d’identité', group: 'driver', required: true },
  { id: 'contrat', label: 'Contrat', group: 'driver', required: true },
  { id: 'casier', label: 'Extrait du casier judiciaire', group: 'driver', required: false },
];

export const VEHICLE_DOCS: DocInfo[] = [
  { id: 'plaques_vtc', label: 'Plaques VTC', group: 'vehicle', required: true },
  { id: 'permis_circulation', label: 'Permis de circulation du véhicule', group: 'vehicle', required: true },
  { id: 'assurance', label: 'Assurance responsabilité transport de personnes', group: 'vehicle', required: true },
  { id: 'controle_technique', label: 'Contrôle technique', group: 'vehicle', required: true },
  { id: 'categorie', label: 'Catégorie et capacités du véhicule', group: 'vehicle', required: true },
];

export const ALL_DOCS: DocInfo[] = [...DRIVER_DOCS, ...VEHICLE_DOCS];

const EMPTY_DOCS = Object.fromEntries(ALL_DOCS.map((d) => [d.id, 'missing'])) as Record<string, DocStatus>;
const EMPTY_EXPIRY = Object.fromEntries(ALL_DOCS.map((d) => [d.id, null])) as Record<string, string | null>;

function initialState(): AppState {
  return {
    signedIn: false,
    profile: { name: '', email: '', phone: '', company: '' },
    role: 'client',
    consents: { terms: false, privacy: false, location: false, marketing: false },
    payment: 'simulated',
    rides: [],
    journal: [],
    driverShareDemo: 0.8,
    driver: {
      online: false,
      sessionEarnings: 0,
      docs: { ...EMPTY_DOCS },
      docExpiry: { ...EMPTY_EXPIRY },
      refused: [],
      vehicleCategory: null,
      vehicleSeats: null,
      vtcCardNumber: '',
      plateLabel: '',
      drivingMinutes: 0,
    },
    cities: { geneve: true, paris: false, casablanca: false },
    aiDispatch: false,
    autoSim: true,
  };
}

function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Raisons pour lesquelles réécrire le document détruirait des données.
 * Les champs inconnus et les valeurs futures d’un type déjà admis ne sont pas des raisons.
 * Une clé absente (ancien document) n’est pas une raison.
 */
export function preservationIssues(saved: unknown): string[] {
  if (!isPlain(saved)) return ['document : forme inattendue'];
  const issues: string[] = [];
  const expectObject = (key: string) => {
    if (!(key in saved)) return;
    if (!isPlain(saved[key])) issues.push(`${key} : forme inattendue, non réécrite`);
  };
  for (const key of ['profile', 'consents', 'driver', 'cities']) expectObject(key);

  if ('rides' in saved) {
    if (!Array.isArray(saved.rides)) {
      issues.push('rides : tableau attendu, forme future ou étrangère laissée intacte');
    } else {
      const ids = new Set<string>();
      saved.rides.forEach((ride, index) => {
        if (!isPlain(ride)) {
          issues.push(`rides[${index}] : entrée non objet`);
          return;
        }
        const id = typeof ride.id === 'string' && ride.id.length > 0 ? ride.id : '';
        if (!id) issues.push(`rides[${index}] : identifiant historique absent ou non textuel`);
        else if (ids.has(id)) issues.push(`rides : identifiant en double ${id}`);
        else ids.add(id);
        const label = id || String(index);
        if ('pickup' in ride && ride.pickup != null && !isPlain(ride.pickup)) issues.push(`course ${label} : adresse de départ illisible`);
        if ('dropoff' in ride && ride.dropoff != null && !isPlain(ride.dropoff)) issues.push(`course ${label} : adresse d’arrivée illisible`);
        if ('events' in ride && ride.events != null && !Array.isArray(ride.events)) issues.push(`course ${label} : historique non tableau`);
        if ('priceMaximum' in ride && ride.priceMaximum != null && typeof ride.priceMaximum !== 'number') issues.push(`course ${label} : prix maximum de forme inattendue`);
        if ('quotedAt' in ride && ride.quotedAt != null && typeof ride.quotedAt !== 'number') issues.push(`course ${label} : horodatage de forme inattendue`);
      });
    }
  }

  if ('journal' in saved) {
    if (!Array.isArray(saved.journal)) {
      issues.push('journal : tableau attendu, historique laissé intact');
    } else {
      const ids = new Set<string>();
      saved.journal.forEach((entry, index) => {
        if (!isPlain(entry)) {
          issues.push(`journal[${index}] : entrée non objet`);
          return;
        }
        const id = typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : '';
        if (!id) issues.push(`journal[${index}] : identifiant historique absent ou non textuel`);
        else if (ids.has(id)) issues.push(`journal : identifiant en double ${id}`);
        else ids.add(id);
      });
    }
  }

  if (isPlain(saved.driver)) {
    const driver = saved.driver;
    if ('docs' in driver && !isPlain(driver.docs)) issues.push('véhicule/documents : forme inattendue');
    if ('docExpiry' in driver && !isPlain(driver.docExpiry)) issues.push('échéances documents : forme inattendue');
    if ('refused' in driver && !Array.isArray(driver.refused)) issues.push('courses refusées : forme inattendue');
    if ('vehicleSeats' in driver && driver.vehicleSeats != null && typeof driver.vehicleSeats !== 'number') issues.push('places véhicule : forme inattendue');
    if ('drivingMinutes' in driver && driver.drivingMinutes != null && typeof driver.drivingMinutes !== 'number') issues.push('minutes de conduite : forme inattendue');
    if ('sessionEarnings' in driver && driver.sessionEarnings != null && typeof driver.sessionEarnings !== 'number') issues.push('gains de session : forme inattendue');
    if ('vtcCardNumber' in driver && driver.vtcCardNumber != null && typeof driver.vtcCardNumber !== 'string') issues.push('carte professionnelle : forme inattendue');
    if ('plateLabel' in driver && driver.plateLabel != null && typeof driver.plateLabel !== 'string') issues.push('plaque : forme inattendue');
    if ('vehicleCategory' in driver && driver.vehicleCategory != null && typeof driver.vehicleCategory !== 'string') issues.push('catégorie véhicule : forme inattendue');
  }

  if ('driverShareDemo' in saved && saved.driverShareDemo != null && typeof saved.driverShareDemo !== 'number') {
    issues.push('hypothèse de part chauffeur : forme inattendue');
  }
  return issues;
}

function normalizeRide(raw: Ride): Ride {
  const priceMaximum = typeof raw.priceMaximum === 'number' ? raw.priceMaximum : raw.price;
  return {
    ...raw,
    priceMaximum,
    quotedAt: typeof raw.quotedAt === 'number' ? raw.quotedAt : raw.createdAt,
    events: Array.isArray(raw.events) ? raw.events : [],
  };
}

export function reviveAppState(saved: Partial<AppState> | null): AppState {
  const base = initialState();
  if (saved == null) return base;
  const issues = preservationIssues(saved);
  if (issues.length) throw new IncompatibleStoredState(issues);
  const driverSaved = saved.driver ?? base.driver;
  const share = typeof saved.driverShareDemo === 'number' ? saved.driverShareDemo : base.driverShareDemo;
  return {
    ...base,
    ...saved,
    profile: { ...base.profile, ...(saved.profile ?? {}) },
    consents: { ...base.consents, ...(saved.consents ?? {}) },
    cities: { ...base.cities, ...(saved.cities ?? {}), geneve: true },
    driverShareDemo: share,
    driver: {
      ...base.driver,
      ...driverSaved,
      docs: { ...base.driver.docs, ...(driverSaved.docs ?? {}) },
      docExpiry: { ...base.driver.docExpiry, ...(driverSaved.docExpiry ?? {}) },
      refused: Array.isArray(driverSaved.refused) ? driverSaved.refused : [],
      vehicleCategory: driverSaved.vehicleCategory ?? null,
      vehicleSeats: typeof driverSaved.vehicleSeats === 'number' ? driverSaved.vehicleSeats : null,
      vtcCardNumber: driverSaved.vtcCardNumber ?? '',
      plateLabel: driverSaved.plateLabel ?? '',
      drivingMinutes: typeof driverSaved.drivingMinutes === 'number' ? driverSaved.drivingMinutes : 0,
    },
    rides: Array.isArray(saved.rides) ? saved.rides.map((r) => normalizeRide(r)) : [],
    journal: Array.isArray(saved.journal) ? saved.journal.map((entry) => ({ ...entry })) : [],
  };
}

/** Déconnexion : le drapeau de session change, le reste du document reste. */
export function applySignOut<T extends { signedIn: boolean }>(s: T): T {
  return { ...s, signedIn: false };
}

/** Enregistre les quatre champs du formulaire sans retirer les clés de profil inconnues. */
export function applyProfile(s: AppState, profile: Pick<AppState['profile'], 'name' | 'email' | 'phone' | 'company'>): AppState {
  return {
    ...s,
    profile: {
      ...s.profile,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      company: profile.company,
    },
  };
}

/** Nouvelle session locale : fusionne le profil et les consentements, ne remplace pas le document. */
export function applySignIn(
  s: AppState,
  input: { name: string; email: string; phone: string; terms: boolean; privacy: boolean; location: boolean; marketing: boolean },
  at = Date.now(),
): AppState {
  return {
    ...s,
    signedIn: true,
    profile: { ...s.profile, name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim() },
    consents: {
      ...s.consents,
      terms: input.terms,
      privacy: input.privacy,
      location: input.location,
      marketing: input.marketing,
      at,
    },
  };
}

function noteInterimDiscard(previous: AppState, loaded: AppState) {
  const kept = new Set((loaded.rides ?? []).map((r) => r.id));
  const lost: LostRide[] = (previous.rides ?? []).filter((r) => !kept.has(r.id)).map((r) => ({ id: r.id, label: `${r.pickup?.label ?? 'départ'} → ${r.dropoff?.label ?? 'arrivée'}` }));
  if (lost.length) publishLostRides(lost);
}

/** Clé inchangée : onyx-transit@v1. La reprise est additive. */
export const store = createPersistedStore<AppState>('onyx-transit', initialState, 1, reviveAppState, AsyncStorage, noteInterimDiscard);

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
  simulated: 'Paiement simulé',
};

/** Commission plateforme utilisée pour le calcul indicatif des gains chauffeur (hypothèse de démo). */
export const DRIVER_SHARE = 0.8;

export const LOCAL_DRIVER_ID = 'local';

function journalEntry(partial: Omit<JournalEntry, 'id' | 'at'> & { at?: number }): JournalEntry {
  return { id: uid('evt_'), at: partial.at ?? Date.now(), rideId: partial.rideId, kind: partial.kind, label: partial.label };
}

export function maximumOf(ride: Ride): number {
  return typeof ride.priceMaximum === 'number' ? ride.priceMaximum : ride.price;
}

export function chargedOf(ride: Ride): number | undefined {
  if (typeof ride.priceCharged === 'number') return ride.priceCharged;
  if (ride.status === 'completed') return ride.price;
  return undefined;
}

export function docReport(s: AppState = store.get(), today = new Date()) {
  return assessDocs(ALL_DOCS, s.driver.docs, s.driver.docExpiry ?? {}, today);
}

export function onlineBlockers(s: AppState = store.get()): DocIssue[] {
  const report = docReport(s);
  const extra: DocIssue[] = [...report.blockers];
  if (!s.driver.vehicleCategory) extra.push({ id: 'vehicleCategory', label: 'Catégorie du véhicule', reason: 'missing' });
  if (s.driver.vehicleSeats == null || s.driver.vehicleSeats < 1) extra.push({ id: 'vehicleSeats', label: 'Nombre de places', reason: 'missing' });
  return extra;
}

export function updateRide(id: string, patch: Partial<Ride> | ((r: Ride) => Partial<Ride>), event?: string) {
  store.set((s) => {
    let journal = s.journal;
    const rides = s.rides.map((r) => {
      if (r.id !== id) return r;
      const raw = typeof patch === 'function' ? patch(r) : patch;
      const max = maximumOf(r);
      let next: Partial<Ride> = raw;
      if (typeof raw.price === 'number') {
        const capped = capToMaximum(max, raw.price);
        next = { ...next, price: capped.value };
        if (capped.capped) {
          journal = [...journal, journalEntry({ rideId: id, kind: 'price', label: 'Prix refusé : au-dessus du maximum annoncé' })];
        }
      }
      if (typeof raw.priceCharged === 'number') {
        const capped = capToMaximum(max, raw.priceCharged);
        next = { ...next, priceCharged: capped.value };
        if (capped.capped) {
          journal = [...journal, journalEntry({ rideId: id, kind: 'price', label: 'Prix facturé ramené au maximum annoncé' })];
        }
      }
      const events = event ? [...r.events, { at: Date.now(), label: event }] : r.events;
      if (event) journal = [...journal, journalEntry({ rideId: id, kind: 'status', label: event })];
      return { ...r, ...next, events };
    });
    return { ...s, rides, journal };
  });
}

export function activeRide(s: AppState): Ride | undefined {
  return s.rides.find((r) => !r.demo && ['requested', 'accepted', 'arriving', 'in_progress'].includes(r.status));
}

export function newRide(input: Omit<Ride, 'id' | 'createdAt' | 'status' | 'progress' | 'events' | 'paymentStatus' | 'priceMaximum' | 'quotedAt'>): Ride {
  const now = Date.now();
  return {
    ...input,
    id: uid('ride_'),
    createdAt: now,
    quotedAt: now,
    priceMaximum: input.price,
    status: 'requested',
    progress: 0,
    paymentStatus: input.payment === 'simulated' ? 'pending' : 'not_configured',
    events: [{ at: now, label: 'Demande envoyée — prix maximum horodaté' }],
  };
}

export function placeRide(ride: Ride) {
  store.set((s) => ({
    ...s,
    rides: [ride, ...s.rides],
    journal: [
      ...s.journal,
      journalEntry({
        at: ride.quotedAt ?? ride.createdAt,
        rideId: ride.id,
        kind: 'quote',
        label: `Prix maximum annoncé ${ride.priceMaximum ?? ride.price} ${ride.currency}`,
      }),
    ],
  }));
}

export function shareRate(s: AppState = store.get()): number {
  return typeof s.driverShareDemo === 'number' ? s.driverShareDemo : DRIVER_SHARE;
}

/** Avance d’une étape (utilisé par le simulateur et par l’espace chauffeur). */
export function advanceRide(id: string, driverName = 'Chauffeur Onyx') {
  const s0 = store.get();
  const r = s0.rides.find((x) => x.id === id);
  if (!r) return;
  const card = s0.driver.vtcCardNumber.trim();
  const plate = s0.driver.plateLabel.trim();
  switch (r.status) {
    case 'requested':
      return updateRide(
        id,
        { status: 'accepted', driverName, driverVtcCard: card, plateLabel: plate, progress: 0, assignedDriverId: r.assignedDriverId ?? LOCAL_DRIVER_ID },
        `Acceptée par ${driverName}`,
      );
    case 'accepted':
      return updateRide(id, { status: 'arriving', progress: 1 }, 'Chauffeur arrivé au point de prise en charge');
    case 'arriving':
      return updateRide(id, { status: 'in_progress', progress: 0 }, 'Course démarrée');
    case 'in_progress': {
      const charged = capToMaximum(maximumOf(r), r.price).value;
      updateRide(
        id,
        { status: 'completed', progress: 1, priceCharged: charged, paymentStatus: r.payment === 'simulated' ? 'simulated_paid' : 'not_configured' },
        'Course terminée',
      );
      const s = store.get();
      if (s.driver.online && !r.simulated) {
        store.set((x) => ({
          ...x,
          driver: {
            ...x.driver,
            sessionEarnings: x.driver.sessionEarnings + charged * shareRate(x),
            drivingMinutes: x.driver.drivingMinutes + r.minutes,
          },
        }));
      }
      return;
    }
  }
}

export function assignRideManually(rideId: string): { ok: boolean; reasons: string[]; notes: string[] } {
  const s = store.get();
  const ride = s.rides.find((r) => r.id === rideId);
  if (!ride) return { ok: false, reasons: ['Course introuvable'], notes: [] };
  if (ride.status !== 'requested') return { ok: false, reasons: ['Cette course n’est plus en attente'], notes: [] };
  const cat = CATEGORIES.find((c) => c.id === ride.category);
  const blockers = docReport(s).blockers;
  const busy = s.rides.some((r) => r.id !== ride.id && !r.simulated && ['accepted', 'arriving', 'in_progress'].includes(r.status));
  const decision = canAssign({
    docBlockers: blockers,
    vehicleCategory: s.driver.vehicleCategory,
    rideCategory: ride.category,
    vehicleSeats: s.driver.vehicleSeats,
    neededSeats: cat?.seats ?? 1,
    online: s.driver.online,
    busy,
    otrMaxMinutes: parseOtrMaxMinutes(ENV.otr2Limits),
    drivingMinutes: s.driver.drivingMinutes,
  });
  if (!decision.ok) {
    store.set((x) => ({
      ...x,
      journal: [...x.journal, journalEntry({ rideId, kind: 'dispatch_blocked', label: decision.reasons.join(' · ') })],
    }));
    return decision;
  }
  updateRide(rideId, { assignedDriverId: LOCAL_DRIVER_ID }, 'Attribution manuelle par l’admin');
  return decision;
}

export function driverIsBusy(s: AppState, exceptId?: string): boolean {
  return s.rides.some((r) => r.id !== exceptId && !r.simulated && ['accepted', 'arriving', 'in_progress'].includes(r.status));
}
