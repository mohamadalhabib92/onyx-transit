import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersistedStore, type KeyValueStorage } from '../src/kit/store.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function memory() {
  const data = new Map<string, string>();
  const flags = { deferRead: false, failRead: false, failWrite: false };
  const keys: string[] = [];
  let writes = 0;
  let removes = 0;
  let pending: (() => void) | null = null;
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
          pending = () => resolve(data.has(key) ? (data.get(key) ?? null) : null);
          return;
        }
        resolve(data.has(key) ? data.get(key)! : null);
      }),
    setItem: async (key, value) => {
      if (flags.failWrite) {
        flags.failWrite = false;
        throw new Error('write-failed');
      }
      keys.push(key);
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
    keys,
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
    set failWrite(value: boolean) {
      flags.failWrite = value;
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

test('un JSON illisible est copié sans écraser l’original, puis le départ à zéro réactive l’enregistrement', async () => {
  const mem = memory();
  const raw = '{cassé';
  mem.data.set('box@v1', raw);
  const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
  const result = await store.hydrate();
  assert.equal(result.status, 'corrupt');
  if (result.status !== 'corrupt') return;
  assert.match(result.backupKey, /^box@v1\.corrupt-\d{4}-\d{2}-\d{2}$/);
  assert.equal(mem.data.get('box@v1'), raw);
  assert.equal(mem.data.get(result.backupKey), raw);
  assert.deepEqual(mem.keys, [result.backupKey]);
  store.set({ name: 'nouveau' });
  await wait(200);
  assert.equal(mem.data.get('box@v1'), raw);
  assert.deepEqual(mem.keys, [result.backupKey]);
  await store.startFresh();
  assert.equal(mem.data.get(result.backupKey), raw);
  assert.deepEqual(JSON.parse(mem.data.get('box@v1')!), { name: '' });
  store.set({ name: 'Ada' });
  await wait(200);
  assert.deepEqual(JSON.parse(mem.data.get('box@v1')!), { name: 'Ada' });
});

test('null, 42 et [1] sont illisibles : copie sans écraser l’original', async () => {
  for (const raw of ['null', '42', '[1]']) {
    const mem = memory();
    mem.data.set('box@v1', raw);
    const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
    const result = await store.hydrate();
    assert.equal(result.status, 'corrupt', raw);
    if (result.status !== 'corrupt') continue;
    assert.equal(mem.data.get('box@v1'), raw);
    assert.equal(mem.data.get(result.backupKey), raw);
    assert.deepEqual(
      mem.keys.filter((k) => k === 'box@v1'),
      [],
    );
    store.set({ name: 'écrasé' });
    await wait(200);
    assert.equal(mem.data.get('box@v1'), raw);
    assert.equal(mem.data.get('box@v1')!.includes('"0"'), false);
  }
});

test('startFresh refuse si la copie a été supprimée', async () => {
  const mem = memory();
  const raw = '{cassé';
  mem.data.set('box@v1', raw);
  const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
  const result = await store.hydrate();
  assert.equal(result.status, 'corrupt');
  if (result.status !== 'corrupt') return;
  mem.data.delete(result.backupKey);
  await assert.rejects(store.startFresh(), /copie de sauvegarde/);
  assert.equal(mem.data.get('box@v1'), raw);
  store.set({ name: 'écrasé' });
  await wait(200);
  assert.equal(mem.data.get('box@v1'), raw);
  assert.equal(mem.keys.includes('box@v1'), false);
});

test('si la copie échoue, l’original illisible n’est pas remplacé', async () => {
  const mem = memory();
  const raw = '{cassé';
  mem.data.set('box@v1', raw);
  mem.failWrite = true;
  const store = createPersistedStore('box', () => ({ name: '' }), 1, undefined, mem.storage);
  const result = await store.hydrate();
  assert.equal(result.status, 'corrupt-copy-failed');
  assert.equal(mem.data.get('box@v1'), raw);
  assert.equal(mem.keys.length, 0);
  await store.startFresh();
  assert.equal(mem.data.get('box@v1'), raw);
  assert.equal(mem.writes, 0);
});

test('une réservation saisie pendant la lecture est abandonnée et signalée', async () => {
  const mem = memory();
  mem.data.set('box@v1', JSON.stringify({ rides: [] as string[] }));
  mem.deferRead = true;
  const lost: string[][] = [];
  const store = createPersistedStore(
    'box',
    () => ({ rides: [] as string[] }),
    1,
    undefined,
    mem.storage,
    (previous, loaded) => {
      const kept = new Set(loaded.rides);
      const gone = previous.rides.filter((id) => !kept.has(id));
      if (gone.length) lost.push(gone);
    },
  );
  const reading = store.hydrate();
  store.set({ rides: ['course-nouvelle'] });
  mem.release();
  await reading;
  assert.deepEqual(store.get().rides, []);
  assert.deepEqual(lost, [['course-nouvelle']]);
  assert.deepEqual(JSON.parse(mem.data.get('box@v1')!).rides, []);
});

test('une lecture sans saisie intermédiaire ne signale aucun abandon', async () => {
  const mem = memory();
  mem.data.set('box@v1', JSON.stringify({ rides: ['déjà'] }));
  let calls = 0;
  const store = createPersistedStore('box', () => ({ rides: [] as string[] }), 1, undefined, mem.storage, () => {
    calls += 1;
  });
  await store.hydrate();
  assert.equal(calls, 0);
  assert.deepEqual(store.get().rides, ['déjà']);
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
