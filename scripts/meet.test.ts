import assert from 'node:assert/strict';
import test from 'node:test';
import { GENEVA_PLACES } from '../src/data/places.ts';
import { announcedMaximum, estimate, CATEGORIES } from '../src/lib/pricing.ts';
import { arrivalRefForBooking, cleanArrivalRef, meetFor } from '../src/lib/meet.ts';

const gva = GENEVA_PLACES.find((p) => p.id === 'gva')!;
const corn = GENEVA_PLACES.find((p) => p.id === 'cornavin')!;
const nations = GENEVA_PLACES.find((p) => p.id === 'nations')!;

test('GVA et Cornavin ouvrent une prise en charge, les autres lieux non', () => {
  assert.equal(meetFor({ label: gva.name })?.kind, 'flight');
  assert.equal(meetFor({ label: corn.name })?.kind, 'train');
  assert.equal(meetFor({ label: nations.name }), null);
  assert.equal(meetFor({ label: 'Ma position' }), null);
  assert.equal(meetFor(null), null);
});

test('la référence vide n’est pas enregistrée, et seulement pour GVA ou Cornavin', () => {
  assert.equal(cleanArrivalRef('  lx   22  '), 'lx 22');
  assert.equal(cleanArrivalRef('   '), undefined);
  assert.equal(cleanArrivalRef('A'.repeat(40))?.length, 24);
  assert.equal(arrivalRefForBooking({ label: gva.name }, ' LX 22 '), 'LX 22');
  assert.equal(arrivalRefForBooking({ label: nations.name }, 'LX 22'), undefined);
  assert.equal(arrivalRefForBooking({ label: gva.name }, '  '), undefined);
});

test('le prix maximum annoncé est le prix déjà calculé, pas la borne haute', () => {
  const quote = estimate(gva, corn, CATEGORIES[0]);
  assert.equal(announcedMaximum(quote), quote.price);
  assert.notEqual(quote.high, quote.price);
  assert.ok(quote.price >= CATEGORIES[0].min);
});
