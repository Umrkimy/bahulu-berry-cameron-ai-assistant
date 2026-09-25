import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterProducts, promotionText } from '../app/_lib/product-view.ts';

const products = [
  { id: 1, name_en: 'Fictional Alpha', name_ms: 'Fiksyen Alfa', category: 'ALL', price: '20.00', sale_price: '0.00' },
  { id: 2, name_en: 'Fictional Beta', name_ms: 'Fiksyen Beta', category: 'Demo', price: '8.00', sale_price: null },
  { id: 3, name_en: 'Fictional Gamma', name_ms: 'Fiksyen Gama', category: 'Demo', price: '12.00', sale_price: '4.00' },
];

test('search matches either approved language and trims whitespace', () => {
  assert.deepEqual(filterProducts(products, 'en', '  GAMA  ', null, 'name').map(p => p.id), [3]);
  assert.deepEqual(filterProducts(products, 'ms', 'ALPHA', null, 'name').map(p => p.id), [1]);
});
test('category named ALL is distinct from the all-products filter', () => {
  assert.equal(filterProducts(products, 'en', '', null, 'name').length, 3);
  assert.deepEqual(filterProducts(products, 'en', '', 'ALL', 'name').map(p => p.id), [1]);
});
test('search and category combine, and no match returns an empty collection', () => {
  assert.equal(filterProducts(products, 'en', 'Alpha', 'Demo', 'name').length, 0);
  assert.deepEqual(filterProducts(products, 'en', 'Gamma', 'Demo', 'name').map(p => p.id), [3]);
});
test('price sort uses sale prices including zero without changing the original array', () => {
  assert.deepEqual(filterProducts(products, 'en', '', null, 'price-low').map(p => p.id), [1, 3, 2]);
  assert.deepEqual(filterProducts(products, 'en', '', null, 'price-high').map(p => p.id), [2, 3, 1]);
  assert.deepEqual(products.map(p => p.id), [1, 2, 3]);
});
test('promotion wording uses approved amounts in both languages', () => {
  assert.equal(promotionText({ discount_type: 'PERCENTAGE', discount_value: '10.00' }, 'en'), '10% off');
  assert.equal(promotionText({ discount_type: 'PERCENTAGE', discount_value: '10.00' }, 'ms'), 'Diskaun 10%');
  assert.match(promotionText({ discount_type: 'FIXED_AMOUNT', discount_value: '2.50' }, 'ms'), /^Diskaun RM\s?2\.50$/);
  assert.match(promotionText({ discount_type: 'BUNDLE_PRICE', discount_value: '12.00', bundle_quantity: 3 }, 'en'), /^Buy 3 for RM\s?12\.00$/);
});
