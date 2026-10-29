import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseVideo, entitlementPayload } from '../src/subscriptions.js';

test('only active Plus and Pro subscriptions can use video', () => {
  const activePlus = {
    subscriptionPlan: 'plus',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: new Date(Date.now() + 86400000),
    videoCallsUsed: 0,
  };
  const activePro = { ...activePlus, subscriptionPlan: 'pro' };
  const expiredPlus = { ...activePlus, subscriptionExpiresAt: new Date(Date.now() - 1) };
  const cancelledPaidThrough = { ...activePlus, subscriptionStatus: 'cancelled' };
  const pendingPlus = { ...activePlus, subscriptionStatus: 'pending' };

  assert.equal(canUseVideo(activePlus), true);
  assert.equal(canUseVideo(activePro), true);
  assert.equal(canUseVideo(cancelledPaidThrough), true);
  assert.equal(canUseVideo(expiredPlus), false);
  assert.equal(canUseVideo(pendingPlus), false);
  assert.equal(canUseVideo({ subscriptionPlan: 'free', subscriptionStatus: 'inactive' }), false);
  assert.equal(entitlementPayload({ subscriptionPlan: 'free' }).plan.id, 'free');
});
