import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Petit store persistant (AsyncStorage sur mobile, localStorage sur web).
 * Aucune dépendance réseau : tout le chemin "core" fonctionne hors ligne.
 *
 * Aucune écriture tant que la lecture n’a pas réussi. « Continuer hors ligne »
 * et « Réessayer » ne doivent pas remplacer les données déjà stockées par l’état initial.
 */
export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};

export type HydrateResult =
  | { status: 'ready' }
  | { status: 'ignored' }
  | { status: 'corrupt'; backupKey: string }
  | { status: 'corrupt-copy-failed' };

export type PersistedStore<T> = {
  get: () => T;
  set: (updater: T | ((prev: T) => T)) => void;
  use: () => T;
  useSelect: <S>(sel: (s: T) => S) => S;
  hydrate: () => Promise<HydrateResult>;
  /** Remplace l’original par un état vide, seulement si la copie brute existe déjà. */
  startFresh: () => Promise<void>;
  reset: () => Promise<void>;
  key: string;
};

/** Objet JSON : ni null, ni tableau, ni nombre, ni chaîne. */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function corruptStamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Copie brute sous une autre clé. N’écrit jamais la clé d’origine. */
async function preserveCorruptRaw(
  storage: KeyValueStorage,
  storageKey: string,
  raw: string,
): Promise<{ ok: true; backupKey: string } | { ok: false }> {
  const day = corruptStamp(new Date());
  let backupKey = `${storageKey}.corrupt-${day}`;
  try {
    const taken = await storage.getItem(backupKey);
    if (taken != null) backupKey = `${backupKey}T${Date.now().toString(36)}`;
    await storage.setItem(backupKey, raw);
    const copied = await storage.getItem(backupKey);
    if (copied !== raw) return { ok: false };
    return { ok: true, backupKey };
  } catch {
    return { ok: false };
  }
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
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Vrai seulement après un getItem réussi (valeur absente comprise) ou un départ à zéro confirmé. */
  let hydrated = false;
  /** Suppression demandée avant la fin de la lecture : appliquée ensuite, sans écriture intermédiaire. */
  let pendingReset = false;
  /** Un set a eu lieu avant la fin de la lecture (réservation saisie pendant le chargement). */
  let mutated = false;
  let corruption: { backupKey: string; raw: string } | null = null;
  let ticket = 0;
  const storageKey = `${key}@v${version}`;

  const emit = () => listeners.forEach((l) => l());
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
      storage.setItem(storageKey, JSON.stringify(state)).catch(() => {
        /* stockage indisponible : on garde l'état en mémoire */
      });
    }, 150);
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
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
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!isJsonObject(parsed)) unreadable = true;
          else loaded = revive ? revive(parsed as Partial<T>) : { ...initial(), ...(parsed as Partial<T>) };
        } catch {
          unreadable = true;
        }
        if (unreadable || loaded === undefined) {
          const preserved = await preserveCorruptRaw(storage, storageKey, raw);
          if (my !== ticket) return { status: 'ignored' };
          if (!preserved.ok) return { status: 'corrupt-copy-failed' };
          if (pendingReset) {
            pendingReset = false;
            const next = initial();
            await storage.setItem(storageKey, JSON.stringify(next));
            if (my !== ticket) return { status: 'ignored' };
            applyLoaded(next);
            hydrated = true;
            corruption = null;
            return { status: 'ready' };
          }
          corruption = { backupKey: preserved.backupKey, raw };
          emit();
          return { status: 'corrupt', backupKey: preserved.backupKey };
        }
        if (!pendingReset) applyLoaded(loaded);
      }
      if (my !== ticket) return { status: 'ignored' };
      if (pendingReset) {
        pendingReset = false;
        state = initial();
        hydrated = true;
        mutated = false;
        emit();
        clearSave();
        await storage.removeItem(storageKey);
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
      state = initial();
      emit();
      clearSave();
      if (!hydrated) {
        pendingReset = true;
        return;
      }
      await storage.removeItem(storageKey);
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
