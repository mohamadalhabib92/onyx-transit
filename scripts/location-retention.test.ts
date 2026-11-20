/**
 * La phrase de confidentialité doit décrire la conservation réelle :
 * les coordonnées restent dans la course. Les tests ne les effacent pas.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { LOCAL_COORDINATE_RETENTION } from '../src/lib/location-copy.ts';
import { createPersistedStore, type KeyValueStorage } from '../src/kit/store.ts';
import { applySignOut, reviveAppState, type AppState } from '../src/state.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const COPY_FILES = ['src/app/privacy.tsx', 'public/privacy/index.html', 'store/ios-metadata.md', 'src/lib/location-copy.ts'];

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function memory() {
  const data = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: async (key) => (data.has(key) ? (data.get(key) ?? null) : null),
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  return { storage, data };
}

test('le texte de confidentialité dit la conservation locale et ne promet pas l’effacement après la course', () => {
  const privacy = read('src/app/privacy.tsx');
  const uses = privacy.split('LOCAL_COORDINATE_RETENTION').length - 1;
  assert.ok(uses >= 3, 'la phrase doit être importée, affichée dans le tableau et répétée dans le résumé');
  for (const rel of ['public/privacy/index.html', 'store/ios-metadata.md']) {
    assert.ok(read(rel).includes(LOCAL_COORDINATE_RETENTION), rel);
  }
  assert.equal(LOCAL_COORDINATE_RETENTION.includes('historique local'), true);
  assert.equal(LOCAL_COORDINATE_RETENTION.includes('aucun serveur de l’application'), true);
  const banned = [/temps de la course uniquement/i, /non conservée ensuite/i, /coordonn[ée]es[^.]{0,80}non conserv/i, /position gps[^.]{0,80}non conserv/i];
  for (const rel of COPY_FILES) {
    const text = read(rel);
    for (const pattern of banned) assert.equal(pattern.test(text), false, `${rel} contient ${pattern}`);
  }
});

test('les coordonnées historiques restent après reprise et déconnexion', async () => {
  const original = {
    signedIn: true,
    rides: [
      {
        id: 'ride_coord_1',
        createdAt: 1700000000000,
        pickup: { lat: 46.519653, lon: 6.632273, label: 'Gare de Lausanne', quai: '5' },
        dropoff: { lat: 46.5074, lon: 6.628, label: 'Ouchy' },
        category: 'business',
        km: 3,
        minutes: 10,
        price: 35,
        currency: 'CHF',
        status: 'completed',
        simulated: false,
        demo: false,
        progress: 1,
        payment: 'invoice',
        paymentStatus: 'pending',
        events: [{ at: 1700000000000, label: 'Demande' }],
      },
    ],
    journal: [{ id: 'evt_coord_1', at: 1700000000000, kind: 'quote', label: 'Prix', rideId: 'ride_coord_1' }],
  };
  const raw = JSON.stringify(original);
  const mem = memory();
  mem.data.set('onyx-transit@v1', raw);
  const box = createPersistedStore<AppState>('onyx-transit', () => reviveAppState(null), 1, reviveAppState, mem.storage);
  const opened = await box.hydrate();
  assert.equal(opened.status, 'ready');
  const loaded = box.get().rides[0];
  assert.equal(loaded?.pickup.lat, 46.519653);
  assert.equal(loaded?.pickup.lon, 6.632273);
  assert.equal(loaded?.dropoff.lat, 46.5074);
  assert.equal(loaded?.dropoff.lon, 6.628);
  box.set((s) => applySignOut(s));
  await wait(200);
  const stored = JSON.parse(mem.data.get('onyx-transit@v1')!);
  assert.equal(stored.rides[0].pickup.lat, 46.519653);
  assert.equal(stored.rides[0].pickup.lon, 6.632273);
  assert.equal(stored.rides[0].dropoff.lat, 46.5074);
  assert.equal(stored.rides[0].dropoff.lon, 6.628);
  assert.equal(stored.rides[0].pickup.quai, '5');
  assert.equal(stored.rides[0].id, 'ride_coord_1');
  assert.equal(stored.journal[0].id, 'evt_coord_1');
});

test('le code des écrans n’envoie pas les courses à un serveur', () => {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name) && fs.readFileSync(p, 'utf8').includes('fetch(')) found.push(path.relative(root, p));
    }
  };
  walk(path.join(root, 'src'));
  assert.deepEqual(found, ['src/kit/crash.ts']);
  const crash = read('src/kit/crash.ts');
  assert.equal(crash.includes('pickup'), false);
  assert.equal(crash.includes('latitude'), false);
  assert.equal(crash.includes('rides'), false);
  const src = walkText(path.join(root, 'src'));
  assert.equal(src.includes('@supabase/supabase-js'), false);
  assert.equal(src.includes('createClient('), false);
});

function walkText(dir: string): string {
  let all = '';
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) all += walkText(p);
    else if (/\.(ts|tsx)$/.test(name)) all += fs.readFileSync(p, 'utf8');
  }
  return all;
}
