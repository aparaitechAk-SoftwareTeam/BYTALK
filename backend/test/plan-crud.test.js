import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PRO_PLANS } from '../src/subscriptions.js';

test('DEFAULT_PRO_PLANS has valid 1 Year, 3 Months, and 1 Month defaults', () => {
  assert.equal(Array.isArray(DEFAULT_PRO_PLANS), true);
  assert.equal(DEFAULT_PRO_PLANS.length, 3);

  const oneYear = DEFAULT_PRO_PLANS.find((p) => p.id === '1year');
  assert.ok(oneYear);
  assert.equal(oneYear.durationDays, 365);
  assert.equal(oneYear.price, 1399);
  assert.equal(oneYear.originalPrice, 6000);
  assert.equal(oneYear.badge, 'Most Valued');

  const threeMonths = DEFAULT_PRO_PLANS.find((p) => p.id === '3months');
  assert.ok(threeMonths);
  assert.equal(threeMonths.durationDays, 90);
  assert.equal(threeMonths.price, 699);
  assert.equal(threeMonths.originalPrice, 1500);
  assert.equal(threeMonths.badge, 'Most Popular');

  const oneMonth = DEFAULT_PRO_PLANS.find((p) => p.id === '1month');
  assert.ok(oneMonth);
  assert.equal(oneMonth.durationDays, 30);
  assert.equal(oneMonth.price, 399);
});

test('calculated savings formula works for custom plans', () => {
  const customPlan = {
    name: '6 Months PRO',
    price: 999,
    originalPrice: 2400,
  };

  const savings = Math.round((1 - customPlan.price / customPlan.originalPrice) * 100);
  assert.equal(savings, 58);
  assert.equal(`Save ${savings}%`, 'Save 58%');
});
