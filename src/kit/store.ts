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

export type PersistedStore<T> = {
  get: () => T;
  set: (updater: T | ((prev: T) => T)) => void;
  use: () => T;
  useSelect: <S>(sel: (s: T) => S) => S;
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;
  key: string;
};

export function createPersistedStore<T extends object>(
  key: string,
  initial: () => T,
  version = 1,
  revive?: (saved: Partial<T>) => T,
  storage: KeyValueStorage = AsyncStorage,
): PersistedStore<T> {
  let state: T = initial();
  const listeners = new Set<() => void>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Vrai seulement après un getItem réussi (valeur absente comprise). */
  let hydrated = false;
  /** Suppression demandée avant la fin de la lecture : appliquée ensuite, sans écriture intermédiaire. */
  let pendingReset = false;
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
        if (my !== ticket) return;
        throw err instanceof Error ? err : new Error('storage');
      }
      if (my !== ticket) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<T>;
          if (!pendingReset) {
            state = revive ? revive(parsed) : { ...initial(), ...parsed };
            emit();
          }
        } catch {
          if (!pendingReset) return;
        }
      }
      if (my !== ticket) return;
      if (pendingReset) {
        pendingReset = false;
        state = initial();
        hydrated = true;
        emit();
        clearSave();
        await storage.removeItem(storageKey);
        return;
      }
      hydrated = true;
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
