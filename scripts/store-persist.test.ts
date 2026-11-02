import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersistedStore, type KeyValueStorage } from '../src/kit/store.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function memory() {
  const data = new Map<string, string>();
  const flags = { deferRead: false, failRead: false };
  let writes = 0;
  let removes = 0;
  let pending: ((value: string | null) => void) | null = null;
  const storage: KeyValueStorage = {
    getItem: (key) =>
      new Promise((resolve, reject) => {
        if (flags.failRead) {
          flags.failRead = false;
          reject(new Error('read-failed'));
          return;
        }
        if (flags.deferRead) {
          flags.deferRead = false;
          pending = () => resolve(data.has(key) ? data.get(key)! : null);
          return;
        }
        resolve(data.has(key) ? data.get(key)! : null);
      }),
    setItem: async (key, value) => {
      writes += 1;
      data.set(key, value);
    },
    removeItem: async (key) => {
      removes += 1;
      data.delete(key);
    },
  };
  return {
    storage,
    data,
    get writes() {
      return writes;
    },
    get removes() {
      return removes;
    },
    set deferRead(value: boolean) {
      flags.deferRead = value;
    },
    set failRead(value: boolean) {
      flags.failRead = value;
    },
    release() {
      const go = pending;
      pending = null;
      if (!go) throw new Error('aucune lecture en attente');
      go();
    },
  };
}

test('un set avant la fin de la lecture n’écrase pas le stockage', async () => {
  const mem = memory();
  const saved = JSON.stringify({ name: 'Ada', rides: ['course-1'] });
  mem.data.set('box@v1', saved);
  mem.deferRead = true;
  const store = createPersistedStore('box', () => ({ name: '', rides: [] as string[] }), 1, undefined, mem.storage);
  const reading = store.hydrate();
  store.set((s) => ({ ...s, name: 'vide' }));
  store.set({ name: '', rides: [] });
  await wait(200);
  assert.equal(mem.writes, 0);
  assert.equal(mem.data.get('box@v1'), saved);

  mem.release();
  await reading;
  assert.deepEqual(store.get(), { name: 'Ada', rides: ['course-1'] });
  assert.equal(mem.writes, 0);

  store.set((s) => ({ ...s, name: 'Ada 2' }));
  await wait(200);
  assert.equal(mem.writes, 1);
  assert.deepEqual(JSON.parse(mem.data.get('box@v1')!), { name: 'Ada 2', rides: ['course-1'] });
});

test('une lecture en échec bloque set et reset', async () => {
  const mem = memory();
  mem.data.set('box@v1', JSON.stringify({ name: 'Ada' }));
  mem.failRead = true;
  const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
  await assert.rejects(store.hydrate(), /read-failed/);
  store.set({ name: '' });
  await store.reset();
  await wait(200);
  assert.equal(mem.writes, 0);
  assert.equal(mem.removes, 0);
  assert.equal(mem.data.get('box@v1'), JSON.stringify({ name: 'Ada' }));
});

test('un JSON illisible n’est pas remplacé par l’état initial', async () => {
  const mem = memory();
  mem.data.set('box@v1', '{cassé');
  const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
  await store.hydrate();
  store.set({ name: 'nouveau' });
  await wait(200);
  assert.equal(mem.writes, 0);
  assert.equal(mem.data.get('box@v1'), '{cassé');
});

test('stockage vide : la lecture réussit et les enregistrements suivants sont permis', async () => {
  const mem = memory();
  const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
  await store.hydrate();
  store.set({ name: 'Ada' });
  await wait(200);
  assert.equal(mem.writes, 1);
  assert.deepEqual(JSON.parse(mem.data.get('box@v1')!), { name: 'Ada' });
});

test('reset avant la lecture ne supprime qu’une fois la lecture réussie, sans setItem vide', async () => {
  const mem = memory();
  mem.data.set('box@v1', JSON.stringify({ name: 'Ada', rides: ['course-1'] }));
  mem.deferRead = true;
  const store = createPersistedStore('box', () => ({ name: '', rides: [] as string[] }), 1, undefined, mem.storage);
  const reading = store.hydrate();
  await store.reset();
  await wait(200);
  assert.equal(mem.writes, 0);
  assert.equal(mem.removes, 0);
  assert.equal(mem.data.has('box@v1'), true);
  mem.release();
  await reading;
  assert.equal(mem.writes, 0);
  assert.equal(mem.removes, 1);
  assert.equal(mem.data.has('box@v1'), false);
});

test('reset après une lecture réussie efface la clé', async () => {
  const mem = memory();
  mem.data.set('box@v1', JSON.stringify({ name: 'Ada' }));
  const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
  await store.hydrate();
  await store.reset();
  assert.equal(mem.removes, 1);
  assert.equal(mem.writes, 0);
  assert.equal(mem.data.has('box@v1'), false);
  assert.deepEqual(store.get(), { name: '' });
});
