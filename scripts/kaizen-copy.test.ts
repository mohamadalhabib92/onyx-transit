/**
 * Le client ne voit pas les détails d’autorisation VTC ni les formules juridiques inachevées.
 * L’espace chauffeur garde la saisie de la carte. L’admin la voit.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

const CLIENT = ['src/app/(tabs)/index.tsx', 'src/app/(tabs)/trips.tsx', 'src/app/welcome.tsx', 'src/app/support.tsx', 'src/app/privacy.tsx', 'src/app/ride/[id].tsx'];

const BANNED = [/N° carte VTC/, /Textes juridiques à valider/, /YOUR_TARIFF_TABLE/, /YOUR_FREE_CANCEL_HOURS/, /Obligation légale \(transport professionnel/, /nLPD/, /Cadre légal à étudier/];

test('les écrans client ne portent plus les formules juridiques inachevées ni le numéro VTC', () => {
  for (const rel of CLIENT) {
    const text = read(rel);
    for (const pattern of BANNED) assert.equal(pattern.test(text), false, `${rel} contient ${pattern}`);
  }
  const privacy = read('src/app/privacy.tsx');
  assert.equal(privacy.includes('LOCAL_COORDINATE_RETENTION'), true);
  assert.equal(privacy.includes('autorisation de transport'), true);
  assert.equal(read('src/app/(tabs)/index.tsx').includes('Prix maximum annoncé'), true);
  assert.equal(read('src/app/(tabs)/driver.tsx').includes('N° de carte VTC'), true);
  assert.equal(read('src/app/(tabs)/admin.tsx').includes('carte_vtc'), true);
  assert.equal(read('src/app/ride/[id].tsx').includes('driverVtcCard'), false);
});
