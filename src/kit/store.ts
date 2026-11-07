import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Petit store persistant (AsyncStorage sur mobile, localStorage sur web).
 * Aucune dépendance réseau : tout le chemin "core" fonctionne hors ligne.
 *
 * Aucune écriture tant que la lecture n’a pas réussi. « Continuer hors ligne »
 * et « Réessayer » ne doivent pas remplacer les données déjà stockées par l’état initial.
 * Une forme illisible ou incompatible n’est pas réécrite : copie brute, empreinte,
 * essai de restauration isolée, puis la clé d’origine reste en place.
 * Il n’y a pas de bascule : aucune méthode ne recolle une copie sur la clé vive.
 */
export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};

export type StorageProof = {
  backupKey: string;
  bytes: number;
  sha256: string;
  topLevelKeys: number | null;
  rides: number | null;
  journal: number | null;
};

export type HydrateResult =
  | { status: 'ready' }
  | { status: 'ignored' }
  | { status: 'corrupt'; backupKey: string; proof: StorageProof }
  | { status: 'incompatible'; backupKey: string; proof: StorageProof; reasons: string[] }
  | { status: 'corrupt-copy-failed' };

export type WriteHealth = { status: 'ok' } | { status: 'failed'; detail: string };

export type ResetResult = { proof: StorageProof | null; deferred: boolean };

export type PersistedStore<T> = {
  get: () => T;
  set: (updater: T | ((prev: T) => T)) => void;
  use: () => T;
  useSelect: <S>(sel: (s: T) => S) => S;
  useWriteHealth: () => WriteHealth;
  writeHealth: () => WriteHealth;
  hydrate: () => Promise<HydrateResult>;
  /** Remplace l’original par un état vide, seulement si la copie brute est prouvée. */
  startFresh: () => Promise<void>;
  /** Efface la clé vive seulement après une copie brute prouvée. Ne restaure pas. */
  reset: () => Promise<ResetResult>;
  /** Octets actuellement stockés sous la clé vive. N’écrit rien. */
  readRaw: () => Promise<string | null>;
  /**
   * Relit une copie, la réécrit dans une clé isolée, vérifie l’empreinte, efface la clé isolée.
   * Ne modifie ni la copie ni la clé vive.
   */
  proveSnapshot: (backupKey: string) => Promise<StorageProof>;
  key: string;
};

/** Forme refusée sans réécriture : schéma futur, forme étrangère, identifiant historique inutilisable. */
export class IncompatibleStoredState extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super(`État incompatible : ${reasons.join(' · ')}`);
    this.name = 'IncompatibleStoredState';
    this.reasons = reasons;
  }
}

/** Objet JSON : ni null, ni tableau, ni nombre, ni chaîne. */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export async function sha256Text(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Empreinte SHA-256 indisponible sur cet environnement. Aucune copie n’est déclarée vérifiée.');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function payloadCounts(raw: string): Pick<StorageProof, 'topLevelKeys' | 'rides' | 'journal'> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isJsonObject(parsed)) return { topLevelKeys: null, rides: null, journal: null };
    return {
      topLevelKeys: Object.keys(parsed).length,
      rides: Array.isArray(parsed.rides) ? parsed.rides.length : null,
      journal: Array.isArray(parsed.journal) ? parsed.journal.length : null,
    };
  } catch {
    return { topLevelKeys: null, rides: null, journal: null };
  }
}

async function unusedKey(storage: KeyValueStorage, base: string): Promise<string> {
  const taken = await storage.getItem(base);
  if (taken == null) return base;
  return `${base}T${Date.now().toString(36)}`;
}

/** Réécrit `raw` dans une clé jetable, compare les octets et l’empreinte, puis l’efface. */
async function proveIsolated(storage: KeyValueStorage, raw: string, scratchBase: string): Promise<string> {
  const sha256 = await sha256Text(raw);
  const scratch = await unusedKey(storage, scratchBase);
  let proved = false;
  try {
    await storage.setItem(scratch, raw);
    const restored = await storage.getItem(scratch);
    if (restored !== raw) throw new Error('Restauration isolée non conforme. La clé vive n’a pas été modifiée.');
    if ((await sha256Text(restored)) !== sha256) throw new Error('Empreinte différente après restauration isolée. La clé vive n’a pas été modifiée.');
    proved = true;
    return sha256;
  } finally {
    try {
      await storage.removeItem(scratch);
    } catch {
      /* contrôlé juste après */
    }
    if (proved) {
      const leftover = await storage.getItem(scratch);
      if (leftover != null) throw new Error('La clé de restauration isolée est encore présente. Opération arrêtée.');
    }
  }
}

async function writeVerifiedCopy(storage: KeyValueStorage, raw: string, backupBase: string): Promise<StorageProof> {
  const backupKey = await unusedKey(storage, backupBase);
  await storage.setItem(backupKey, raw);
  const copied = await storage.getItem(backupKey);
  if (copied !== raw) throw new Error('La copie brute ne correspond pas aux octets d’origine.');
  const sha256 = await proveIsolated(storage, copied, `${backupKey}.restore-isolated`);
  const still = await storage.getItem(backupKey);
  if (still !== raw) throw new Error('La copie brute a changé pendant la vérification.');
  return { backupKey, bytes: still.length, sha256, ...payloadCounts(still) };
}

export function createPersistedStore<T extends object>(
  key: string,
  initial: () => T,
  version = 1,
  revive?: (saved: Partial<T>) => T,
  storage: KeyValueStorage = AsyncStorage,
  onInterimDiscard?: (previous: T, loaded: T) => void,
): PersistedStore<T> {
  let state: T = initial();
  const listeners = new Set<() => void>();
  const healthListeners = new Set<() => void>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Vrai seulement après un getItem réussi (valeur absente comprise) ou un départ à zéro confirmé. */
  let hydrated = false;
  /** Suppression demandée avant la fin de la lecture : appliquée ensuite, sans écriture intermédiaire. */
  let pendingReset = false;
  /** Un set a eu lieu avant la fin de la lecture (réservation saisie pendant le chargement). */
  let mutated = false;
  let corruption: { backupKey: string; raw: string } | null = null;
  let writeHealth: WriteHealth = { status: 'ok' };
  let ticket = 0;
  const storageKey = `${key}@v${version}`;

  const emit = () => listeners.forEach((l) => l());
  const setHealth = (next: WriteHealth) => {
    writeHealth = next;
    healthListeners.forEach((l) => l());
  };
  const clearSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
  };
  const persist = () => {
    if (!hydrated) return;
    clearSave();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (!hydrated) return;
      const body = JSON.stringify(state);
      storage
        .setItem(storageKey, body)
        .then(async () => {
          const back = await storage.getItem(storageKey);
          if (!hydrated) return;
          const current = JSON.stringify(state);
          if (back !== body && back !== current) {
            setHealth({
              status: 'failed',
              detail: 'La relecture ne correspond pas à ce qui devait être enregistré. L’échec est affiché ; ce n’est pas une sauvegarde.',
            });
            return;
          }
          setHealth({ status: 'ok' });
        })
        .catch(() => {
          setHealth({
            status: 'failed',
            detail: 'L’écriture a été refusée. Les octets déjà stockés n’ont pas été remplacés.',
          });
        });
    }, 150);
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  const holdUnreadable = async (raw: string, prefix: 'corrupt' | 'incompatible', reasons: string[]): Promise<HydrateResult> => {
    let proof: StorageProof;
    try {
      proof = await writeVerifiedCopy(storage, raw, `${storageKey}.${prefix}-${stamp(new Date())}`);
    } catch {
      return { status: 'corrupt-copy-failed' };
    }
    const live = await storage.getItem(storageKey);
    if (live !== raw) return { status: 'corrupt-copy-failed' };
    if (pendingReset) {
      pendingReset = false;
      await storage.removeItem(storageKey);
      const previous = state;
      const next = initial();
      if (mutated) onInterimDiscard?.(previous, next);
      mutated = false;
      state = next;
      hydrated = true;
      corruption = null;
      clearSave();
      emit();
      return { status: 'ready' };
    }
    corruption = { backupKey: proof.backupKey, raw };
    emit();
    if (prefix === 'incompatible') return { status: 'incompatible', backupKey: proof.backupKey, proof, reasons };
    return { status: 'corrupt', backupKey: proof.backupKey, proof };
  };

  const store: PersistedStore<T> = {
    key: storageKey,
    get: () => state,
    set: (updater) => {
      state = typeof updater === 'function' ? (updater as (p: T) => T)(state) : updater;
      if (!hydrated) mutated = true;
      emit();
      persist();
    },
    use: () => useSyncExternalStore(subscribe, () => state, () => state),
    useSelect: <S,>(sel: (s: T) => S) => useSyncExternalStore(subscribe, () => sel(state), () => sel(state)),
    writeHealth: () => writeHealth,
    useWriteHealth: () =>
      useSyncExternalStore(
        (l) => {
          healthListeners.add(l);
          return () => {
            healthListeners.delete(l);
          };
        },
        () => writeHealth,
        () => writeHealth,
      ),
    hydrate: async () => {
      const my = ++ticket;
      if (!hydrated) clearSave();
      let raw: string | null;
      try {
        raw = await storage.getItem(storageKey);
      } catch (err) {
        if (my !== ticket) return { status: 'ignored' };
        throw err instanceof Error ? err : new Error('storage');
      }
      if (my !== ticket) return { status: 'ignored' };

      const applyLoaded = (loaded: T) => {
        const previous = state;
        if (mutated) onInterimDiscard?.(previous, loaded);
        mutated = false;
        state = loaded;
        hydrated = true;
        emit();
      };

      if (raw) {
        let loaded: T | undefined;
        let unreadable = false;
        let incompatible: IncompatibleStoredState | null = null;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!isJsonObject(parsed)) unreadable = true;
          else {
            try {
              loaded = revive ? revive(parsed as Partial<T>) : { ...initial(), ...(parsed as Partial<T>) };
            } catch (err) {
              if (err instanceof IncompatibleStoredState) incompatible = err;
              else unreadable = true;
            }
          }
        } catch {
          unreadable = true;
        }
        if (unreadable || incompatible || loaded === undefined) {
          const held = await holdUnreadable(raw, incompatible ? 'incompatible' : 'corrupt', incompatible?.reasons ?? []);
          if (my !== ticket) return { status: 'ignored' };
          return held;
        }
        if (!pendingReset) applyLoaded(loaded);
      }
      if (my !== ticket) return { status: 'ignored' };
      if (pendingReset) {
        pendingReset = false;
        try {
          if (raw != null) {
            await writeVerifiedCopy(storage, raw, `${storageKey}.deleted-${stamp(new Date())}`);
            const live = await storage.getItem(storageKey);
            if (live !== raw) throw new Error('clé vive modifiée');
          }
          await storage.removeItem(storageKey);
        } catch {
          pendingReset = true;
          return { status: 'corrupt-copy-failed' };
        }
        state = initial();
        hydrated = true;
        mutated = false;
        emit();
        clearSave();
        return { status: 'ready' };
      }
      hydrated = true;
      if (mutated) {
        persist();
        mutated = false;
      }
      return { status: 'ready' };
    },
    startFresh: async () => {
      if (!corruption) return;
      let copied: string | null;
      try {
        copied = await storage.getItem(corruption.backupKey);
      } catch {
        throw new Error('La copie de sauvegarde n’a pas pu être relue. Le remplacement est refusé et l’original n’a pas été modifié.');
      }
      if (copied !== corruption.raw) {
        throw new Error('La copie de sauvegarde est absente ou ne correspond plus au contenu brut. Le remplacement est refusé et l’original n’a pas été modifié.');
      }
      await proveIsolated(storage, copied, `${corruption.backupKey}.restore-isolated`);
      const still = await storage.getItem(corruption.backupKey);
      if (still !== corruption.raw) {
        throw new Error('La copie de sauvegarde a changé pendant la vérification. Le remplacement est refusé et l’original n’a pas été modifié.');
      }
      const next = initial();
      await storage.setItem(storageKey, JSON.stringify(next));
      const previous = state;
      if (mutated) onInterimDiscard?.(previous, next);
      mutated = false;
      state = next;
      hydrated = true;
      corruption = null;
      clearSave();
      emit();
    },
    reset: async () => {
      if (!hydrated) {
        state = initial();
        emit();
        clearSave();
        pendingReset = true;
        return { proof: null, deferred: true };
      }
      clearSave();
      const raw = await storage.getItem(storageKey);
      let proof: StorageProof | null = null;
      if (raw != null) {
        proof = await writeVerifiedCopy(storage, raw, `${storageKey}.deleted-${stamp(new Date())}`);
        const live = await storage.getItem(storageKey);
        if (live !== raw) {
          throw new Error('La clé vive a changé pendant la copie. Suppression annulée : l’original n’a pas été effacé.');
        }
      }
      await storage.removeItem(storageKey);
      state = initial();
      mutated = false;
      corruption = null;
      emit();
      return { proof, deferred: false };
    },
    readRaw: () => storage.getItem(storageKey),
    proveSnapshot: async (backupKey: string) => {
      const raw = await storage.getItem(backupKey);
      if (raw == null) throw new Error('Copie absente. Rien n’a été écrit sur la clé vive.');
      const liveBefore = await storage.getItem(storageKey);
      const sha256 = await proveIsolated(storage, raw, `${backupKey}.restore-isolated`);
      const liveAfter = await storage.getItem(storageKey);
      if (liveAfter !== liveBefore) throw new Error('La clé vive a changé pendant la preuve. Aucune bascule n’est autorisée.');
      const copied = await storage.getItem(backupKey);
      if (copied !== raw) throw new Error('La copie a changé pendant la preuve.');
      return { backupKey, bytes: raw.length, sha256, ...payloadCounts(raw) };
    },
  };
  return store;
}

/** Résout une promesse ou échoue après `ms` (évite les "Loading" infinis). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function uid(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
