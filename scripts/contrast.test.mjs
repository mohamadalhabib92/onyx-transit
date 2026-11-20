// Contraste WCAG AA (≥ 4,5:1) de la palette sombre Onyx (src/theme.ts, lue sans React).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/theme.ts', import.meta.url), 'utf8');
const c = Object.fromEntries([...src.matchAll(/(\w+): '(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], m[2]]));

const lum = (h) => {
  const x = h.replace("#", "");
  const hex = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const PAIRS = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface2'],
  ['textMuted', 'bg'], ['textMuted', 'surface'], ['textMuted', 'surface2'],
  ['primaryText', 'primary'], ['primary', 'surface'], ['primary', 'bg'], ['accent', 'surface'],
  ['success', 'surface'], ['warning', 'surface'], ['danger', 'surface'], ['danger', 'surface2'], ['info', 'surface'],
  ['mapLabel', 'mapWater'],
];

test('palette Onyx lue', () => assert.ok(Object.keys(c).length >= 15));
for (const [fg, bg] of PAIRS) {
  test(`AA sombre : ${fg} sur ${bg}`, () => {
    assert.ok(c[fg] && c[bg], `jeton manquant ${fg}/${bg}`);
    const r = ratio(c[fg], c[bg]);
    assert.ok(r >= 4.5, `${fg} (${c[fg]}) sur ${bg} (${c[bg]}) = ${r.toFixed(2)} < 4,5`);
  });
}
