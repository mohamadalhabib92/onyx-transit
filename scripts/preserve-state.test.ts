/**
 * Préservation du document local : anciennes courses, champs inconnus,
 * forme future ou étrangère, échec d’écriture, déconnexion, historique.
 * Ces tests tournent en mémoire. Ils ne sont pas une sauvegarde d’appareil.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersistedStore, sha256Text, type KeyValueStorage } from '../src/kit/store.ts';
import { applyProfile, applySignIn, applySignOut, reviveAppState, type AppState } from '../src/state.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function memory() {
  const data = new Map<string, string>();
  const flags = { failWrite: false };
  let writes = 0;
  const storage: KeyValueStorage = {
    getItem: async (key) => (data.has(key) ? data.get(key)! : null),
    setItem: async (key, value) => {
      if (flags.failWrite) {
        flags.failWrite = false;
        throw new Error('write-failed');
      }
      writes += 1;
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  return {
    storage,
    data,
    get writes() {
      return writes;
    },
    set failWrite(value: boolean) {
      flags.failWrite = value;
    },
  };
}

function oldDocument() {
  return {
    signedIn: true,
    profile: { name: 'Ada', email: 'ada@exemple.ch', phone: '+41 21 000 00 00', company: 'Atelier', clientId: 'c-9' },
    role: 'client',
    consents: { terms: true, privacy: true, location: false, marketing: false, at: 1700000000000, channel: 'papier' },
    payment: 'invoice',
    rides: [
      {
        id: 'ride_lausanne_1',
        createdAt: 1700000000000,
        pickup: { lat: 46.516, lon: 6.629, label: 'Gare de Lausanne', quai: '4' },
        dropoff: { lat: 46.507, lon: 6.627, label: 'Ouchy' },
        category: 'business',
        km: 3.4,
        minutes: 12,
        price: 35,
        currency: 'CHF',
        status: 'completed',
        simulated: false,
        demo: false,
        progress: 1,
        payment: 'invoice',
        paymentStatus: 'pending',
        events: [{ at: 1700000000000, label: 'Demande envoyée' }],
        customerRef: 'cli-9',
      },
      {
        id: 'ride_demo_2',
        createdAt: 1700000001000,
        pickup: { lat: 46.2, lon: 6.14, label: 'Genève' },
        dropoff: { lat: 46.23, lon: 6.11, label: 'Aéroport' },
        category: 'first',
        km: 5,
        minutes: 15,
        price: 55,
        currency: 'CHF',
        status: 'requested',
        simulated: true,
        demo: true,
        progress: 0,
        payment: 'simulated',
        paymentStatus: 'pending',
        events: [{ at: 1700000001000, label: 'Test' }],
      },
    ],
    journal: [
      { id: 'evt_historique_1', at: 1700000000000, rideId: 'ride_lausanne_1', kind: 'quote', label: 'Prix maximum annoncé 35 CHF', source: 'import' },
    ],
    driver: {
      online: false,
      sessionEarnings: 12,
      docs: { permis: 'missing', dossierImporte: 'uploaded_placeholder' },
      docExpiry: { permis: null },
      refused: ['ride_refusee'],
      vehicleCategory: 'business',
      vehicleSeats: 3,
      vtcCardNumber: 'NON-VERIFIEE',
      plateLabel: 'VD 1',
      drivingMinutes: 40,
      vehicleNote: 'ne pas perdre',
    },
    invoices: [{ id: 'inv-1', rideId: 'ride_lausanne_1', total: 35 }],
    notes: 'préférence : silence',
    imports: [{ id: 'imp-1', at: 1700000000000 }],
    customers: [{ id: 'c-9', name: 'Ada' }],
  };
}

test('une ancienne course garde identifiants, adresses, champs inconnus, et la déconnexion ne réécrit pas l’historique', async () => {
  const mem = memory();
  const original = oldDocument();
  const raw = JSON.stringify(original);
  mem.data.set('onyx-transit@v1', raw);
  const box = createPersistedStore<AppState>('onyx-transit', () => reviveAppState(null), 1, reviveAppState, mem.storage);
  const opened = await box.hydrate();
  assert.equal(opened.status, 'ready');
  const loaded = box.get() as AppState & {
    invoices: { id: string }[];
    notes: string;
    imports: { id: string }[];
    customers: { id: string }[];
  };
  assert.equal(loaded.rides[0]?.id, 'ride_lausanne_1');
  assert.equal(loaded.rides[1]?.id, 'ride_demo_2');
  assert.equal(loaded.rides[0]?.pickup.label, 'Gare de Lausanne');
  assert.equal((loaded.rides[0]?.pickup as { quai?: string }).quai, '4');
  assert.equal(loaded.rides[0]?.dropoff.label, 'Ouchy');
  assert.equal((loaded.rides[0] as { customerRef?: string }).customerRef, 'cli-9');
  assert.equal(loaded.rides[0]?.priceMaximum, 35);
  assert.equal(loaded.journal[0]?.id, 'evt_historique_1');
  assert.equal((loaded.journal[0] as { source?: string }).source, 'import');
  assert.equal((loaded.profile as { clientId?: string }).clientId, 'c-9');
  assert.equal((loaded.consents as { channel?: string }).channel, 'papier');
  assert.equal(loaded.invoices[0]?.id, 'inv-1');
  assert.equal(loaded.notes, 'préférence : silence');
  assert.equal(loaded.imports[0]?.id, 'imp-1');
  assert.equal(loaded.customers[0]?.id, 'c-9');
  assert.equal((loaded.driver as { vehicleNote?: string }).vehicleNote, 'ne pas perdre');
  assert.equal(loaded.driver.docs.dossierImporte, 'uploaded_placeholder');

  const journalBefore = JSON.stringify(loaded.journal);
  box.set((s) => applySignOut(s));
  await wait(200);
  const stored = JSON.parse(mem.data.get('onyx-transit@v1')!);
  assert.equal(stored.signedIn, false);
  assert.equal(stored.rides[0].id, 'ride_lausanne_1');
  assert.equal(stored.rides[0].pickup.label, 'Gare de Lausanne');
  assert.equal(stored.rides[0].pickup.quai, '4');
  assert.equal(stored.rides[0].customerRef, 'cli-9');
  assert.equal(stored.rides[1].id, 'ride_demo_2');
  assert.equal(stored.rides[1].demo, true);
  assert.equal(JSON.stringify(stored.journal), journalBefore);
  assert.equal(stored.invoices[0].id, 'inv-1');
  assert.equal(stored.notes, 'préférence : silence');
  assert.equal(stored.imports[0].id, 'imp-1');
  assert.equal(stored.customers[0].id, 'c-9');
  assert.equal(stored.profile.clientId, 'c-9');
  assert.equal(stored.consents.channel, 'papier');
  assert.equal(stored.driver.vehicleNote, 'ne pas perdre');
  assert.equal(stored.driver.plateLabel, 'VD 1');
});

test('une forme future et une forme étrangère ne sont pas réécrites, même après déconnexion', async () => {
  const future = JSON.stringify({
    schemaVersion: 9,
    rides: { ride_lausanne_1: { id: 'ride_lausanne_1', pickup: { label: 'Lausanne' } } },
    journal: { evt_1: { id: 'evt_1', label: 'historique' } },
    invoices: [{ id: 'inv-9' }],
    profile: { name: 'Ada', clientId: 'c-9' },
  });
  const foreign = JSON.stringify({
    rides: ['pas-une-course'],
    journal: 'historique',
    profile: 'Ada',
    customers: [{ id: 'c-1' }],
  });
  for (const raw of [future, foreign]) {
    const mem = memory();
    mem.data.set('onyx-transit@v1', raw);
    const box = createPersistedStore<AppState>('onyx-transit', () => reviveAppState(null), 1, reviveAppState, mem.storage);
    const result = await box.hydrate();
    assert.equal(result.status, 'incompatible');
    if (result.status !== 'incompatible') continue;
    assert.match(result.backupKey, /^onyx-transit@v1\.incompatible-\d{4}-\d{2}-\d{2}$/);
    assert.equal(mem.data.get('onyx-transit@v1'), raw);
    assert.equal(mem.data.get(result.backupKey), raw);
    assert.equal(mem.data.has(`${result.backupKey}.restore-isolated`), false);
    assert.equal(result.proof.bytes, raw.length);
    assert.equal(result.proof.sha256, await sha256Text(raw));
    assert.ok(result.reasons.length >= 1);
    const writes = mem.writes;
    box.set((s) => applySignOut(s));
    await wait(200);
    assert.equal(mem.writes, writes);
    assert.equal(mem.data.get('onyx-transit@v1'), raw);
    const proved = await box.proveSnapshot(result.backupKey);
    assert.equal(proved.sha256, result.proof.sha256);
    assert.equal(proved.bytes, raw.length);
    assert.equal(mem.data.get('onyx-transit@v1'), raw);
    if (raw === future) {
      assert.equal(result.proof.rides, null);
      assert.equal(result.proof.topLevelKeys, 5);
    }
  }
});

test('un prix maximum non numérique et un identifiant numérique bloquent la réécriture', async () => {
  const raw = JSON.stringify({
    rides: [{ id: 12, pickup: { label: 'Lausanne' }, dropoff: { label: 'Ouchy' }, priceMaximum: '35 CHF' }],
    journal: [],
  });
  const mem = memory();
  mem.data.set('onyx-transit@v1', raw);
  const box = createPersistedStore<AppState>('onyx-transit', () => reviveAppState(null), 1, reviveAppState, mem.storage);
  const result = await box.hydrate();
  assert.equal(result.status, 'incompatible');
  assert.equal(mem.data.get('onyx-transit@v1'), raw);
});

test('une écriture refusée laisse les octets précédents et signale l’échec', async () => {
  const mem = memory();
  const raw = JSON.stringify(oldDocument());
  mem.data.set('onyx-transit@v1', raw);
  const box = createPersistedStore<AppState>('onyx-transit', () => reviveAppState(null), 1, reviveAppState, mem.storage);
  await box.hydrate();
  mem.failWrite = true;
  box.set((s) => applyProfile(s, { name: 'Nouveau', email: 'n@exemple.ch', phone: '', company: '' }));
  await wait(200);
  assert.equal(mem.data.get('onyx-transit@v1'), raw);
  assert.equal(box.writeHealth().status, 'failed');
  const again = JSON.parse(raw);
  assert.equal(again.rides.length, 2);
  assert.equal(again.journal.length, 1);
  assert.equal(again.journal[0].id, 'evt_historique_1');
});

test('profil, connexion et déconnexion conservent les clés inconnues et n’ôtent pas les courses de test', () => {
  const revived = reviveAppState(oldDocument() as unknown as AppState);
  const signedOut = applySignOut(revived);
  assert.equal(signedOut.signedIn, false);
  assert.equal(signedOut.rides.length, revived.rides.length);
  assert.equal(JSON.stringify(signedOut.journal), JSON.stringify(revived.journal));
  assert.equal((signedOut as AppState & { invoices: unknown[] }).invoices.length, 1);

  const signedIn = applySignIn(
    signedOut,
    { name: 'Ada Deux', email: 'ada@exemple.ch', phone: '+41', terms: true, privacy: true, location: true, marketing: false },
    42,
  );
  assert.equal((signedIn.profile as { clientId?: string }).clientId, 'c-9');
  assert.equal((signedIn.consents as { channel?: string }).channel, 'papier');
  assert.equal(signedIn.consents.at, 42);
  assert.equal(signedIn.rides[1]?.demo, true);
  assert.equal(signedIn.rides[0]?.id, 'ride_lausanne_1');

  const savedProfile = applyProfile(signedIn, { name: 'Ada Deux', email: 'ada@exemple.ch', phone: '+41', company: 'Atelier' });
  assert.equal((savedProfile.profile as { clientId?: string }).clientId, 'c-9');
  assert.deepEqual(
    savedProfile.journal.map((entry) => entry.id),
    ['evt_historique_1'],
  );
});
