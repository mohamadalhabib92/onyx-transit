/**
 * Garde-fous Passe 1 : propriété DOM, variable de test, contraste AA, règles pures.
 * node --experimental-strip-types scripts/check-passe1.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { assessDocs, canAssign, capToMaximum, contrastRatio, meetsAA, parseIsoDate, parseOtrMaxMinutes } from '../src/lib/rules.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const failures: string[] = [];
const fail = (m: string) => failures.push(m);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const bannedExample = ['EXPO_PUBLIC_EXAMPLE_EN', 'test'].join('=');
const files = walk(root).filter((p) => /\.(ts|tsx|js|mjs|json|yml|html|md|example)$/.test(p) && !p.endsWith(`${path.sep}scripts${path.sep}check-passe1.ts`));
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  if (text.includes(bannedExample)) {
    fail(`${rel} contient encore l’ancienne variable de test`);
  }
  if (/\btransform-origin\s*:/.test(text) || /\bclip-path\s*:/.test(text)) {
    fail(`${rel} utilise une propriété de style en kebab-case`);
  }
  if (rel.endsWith('.ts') || rel.endsWith('.tsx') || rel.endsWith('.json')) {
    if (/BEGIN [A-Z ]*PRIVATE KEY/.test(text) || /sk_(live|test)_[A-Za-z0-9]{8,}/.test(text)) fail(`${rel} semble contenir un secret`);
  }
}

const map = fs.readFileSync(path.join(root, 'src/components/RouteMap.tsx'), 'utf8');
if (!map.includes('transformOrigin:')) fail('RouteMap ne déclare pas transformOrigin en camelCase');

const theme = fs.readFileSync(path.join(root, 'src/theme.ts'), 'utf8');
const hex = (name: string) => {
  const m = theme.match(new RegExp(name + ":\\s*'(#[0-9A-Fa-f]{6})'"));
  if (!m) fail(`token ${name} introuvable`);
  return m?.[1] ?? '#000000';
};
const pairs: [string, string, string][] = [
  ['text', 'bg', 'texte / fond'],
  ['textMuted', 'bg', 'texte secondaire / fond'],
  ['textMuted', 'surface', 'texte secondaire / surface'],
  ['textMuted', 'surface2', 'texte secondaire / surface2'],
  ['primaryText', 'primary', 'texte sur or'],
  ['primaryText', 'danger', 'texte sur danger'],
  ['primaryText', 'success', 'texte sur succès'],
  ['primaryText', 'warning', 'texte sur alerte'],
  ['text', 'surface', 'texte / surface'],
  ['mapLabel', 'bg', 'étiquette carte / fond'],
  ['primary', 'bg', 'or / fond'],
];
for (const [fg, bg, label] of pairs) {
  const ratio = contrastRatio(hex(fg), hex(bg));
  if (!meetsAA(hex(fg), hex(bg))) fail(`${label} ${ratio.toFixed(2)}:1 < 4.5:1`);
}

if (capToMaximum(40, 50).value !== 40 || !capToMaximum(40, 50).capped) fail('le prix facturé doit être plafonné');
if (capToMaximum(40, 30).capped) fail('un prix sous le maximum ne doit pas être modifié');
if (parseOtrMaxMinutes('YOUR_OTR2_LIMITS') !== null) fail('un placeholder OTR ne doit pas devenir un seuil');
if (parseOtrMaxMinutes(undefined) !== null) fail('OTR absent doit rester non configuré');
if (parseIsoDate('2026-02-31') !== null) fail('date impossible acceptée');

const today = new Date(2026, 10, 2);
const blocked = assessDocs(
  [{ id: 'carte_pro', label: 'Carte VTC', required: true }],
  { carte_pro: 'missing' },
  {},
  today,
);
if (!blocked.blockers.length) fail('carte VTC manquante doit bloquer');
const expired = assessDocs(
  [{ id: 'carte_pro', label: 'Carte VTC', required: true }],
  { carte_pro: 'validated_demo' },
  { carte_pro: '2020-01-01' },
  today,
);
if (expired.blockers[0]?.reason !== 'expired') fail('document expiré doit bloquer');
const soon = assessDocs(
  [{ id: 'carte_pro', label: 'Carte VTC', required: true }],
  { carte_pro: 'validated_demo' },
  { carte_pro: '2026-11-20' },
  today,
);
if (soon.blockers.length || soon.warnings[0]?.reason !== 'expiring') fail('échéance à 30 jours = rappel, pas un blocage');

const refused = canAssign({
  docBlockers: blocked.blockers,
  vehicleCategory: 'business',
  rideCategory: 'business',
  vehicleSeats: 3,
  neededSeats: 3,
  online: true,
  busy: false,
  otrMaxMinutes: null,
  drivingMinutes: 0,
});
if (refused.ok) fail('dispatch doit refuser sans documents');
if (!refused.notes.length) fail('OTR non configuré doit être signalé à valider, sans bloquer à lui seul');

const category = canAssign({
  docBlockers: [],
  vehicleCategory: 'business',
  rideCategory: 'van',
  vehicleSeats: 3,
  neededSeats: 6,
  online: false,
  busy: true,
  otrMaxMinutes: 100,
  drivingMinutes: 100,
});
if (category.ok || category.reasons.length < 3) fail('dispatch doit cumuler catégorie, places, disponibilité et OTR');

const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
if (app.expo.ios.bundleIdentifier !== 'com.vibecode.onyxtransit-mvty5t') fail('bundle id modifié');
if (app.expo.android.package !== 'ch.mohamadba.onyxtransit') fail('package android modifié');
if (app.expo.experiments?.baseUrl !== '/onyx-transit') fail('baseUrl web modifié');
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
if (eas.submit?.production?.ios?.appleTeamId !== 'Y9XF9RY2BU') fail('équipe Apple modifiée');
for (const name of ['development', 'preview', 'production']) {
  if (eas.build?.[name]?.env?.EXPO_NO_CAPABILITY_SYNC !== '1') fail(`EXPO_NO_CAPABILITY_SYNC manquant sur ${name}`);
}
const storeSrc = fs.readFileSync(path.join(root, 'src/state.ts'), 'utf8');
if (!storeSrc.includes("createPersistedStore<AppState>('onyx-transit'")) fail('clé de stockage modifiée');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Passe 1 checks OK (${pairs.length} contrastes, dispatch, documents, identifiants).`);
