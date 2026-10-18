import test from 'node:test';
import assert from 'node:assert/strict';
import { priceLabel, generationPriceLabel } from '../src/services/pricing.js';
const t = (key, values = {}) => key.replace(/\{\{(\w+)\}\}/g, (_, name) => values[name]);
test('unknown prices never display zero; model labels distinguish fixed and minimum backend prices', () => {
  for (const value of [
    null,
    {},
    { status: 'PRICE_UNAVAILABLE', credits: null },
    { status: 'AVAILABLE', credits: 0 },
  ])
    assert.equal(priceLabel(value, t), 'Цена не указана');
  assert.equal(priceLabel({ status: 'AVAILABLE', credits: 7, kind: 'fixed' }, t), '7 кр.');
  assert.equal(priceLabel({ status: 'AVAILABLE', credits: 7, kind: 'from' }, t), 'от 7 кр.');
});
test('history displays the saved job price and ADMIN exemption independently', () => {
  assert.equal(
    generationPriceLabel(
      { pricing: { status: 'AVAILABLE', credits: 7 }, adminTest: true, chargedCredits: 0 },
      t,
    ),
    '7 кр. · списание 0',
  );
  assert.equal(
    generationPriceLabel({ pricing: { status: 'AVAILABLE', credits: 14 }, chargedCredits: 14 }, t),
    '14 кр.',
  );
  assert.equal(generationPriceLabel({ chargedCredits: 3 }, t), 'Списано 3 кр.');
});
