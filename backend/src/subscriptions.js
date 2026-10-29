export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceInr: 0,
    billingInterval: 'forever',
    limits: { monthlyVoiceMinutes: 10, monthlyVideoCalls: 0 },
    features: ['Profile and partner discovery', 'Text messaging', 'Public speaking rooms', 'Limited voice-call access'],
  },
  plus: {
    id: 'plus',
    name: 'BYTALK Plus',
    priceInr: 199,
    billingInterval: 'month',
    limits: { monthlyVoiceMinutes: 120, monthlyVideoCalls: null },
    features: ['Everything in Free', 'Full video-call access', 'Advanced language and country filters', 'Expanded translation and vocabulary features', 'Standard premium rooms'],
  },
  pro: {
    id: 'pro',
    name: 'BYTALK Pro',
    priceInr: 399,
    billingInterval: 'month',
    limits: { monthlyVoiceMinutes: null, monthlyVideoCalls: null },
    features: ['Everything in Plus', 'Premium speaking rooms', 'Priority discovery', 'Advanced learning statistics'],
  },
};

export function getPlan(planId) {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;
}

export function activeSubscription(user) {
  const planId = user.subscriptionPlan || 'free';
  const expiresAt = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
  const providerStatus = user.subscriptionStatus || 'inactive';
  const active = planId !== 'free'
    && ['active', 'cancelled'].includes(providerStatus)
    && (!expiresAt || expiresAt > new Date());
  return {
    plan: active ? getPlan(planId) : SUBSCRIPTION_PLANS.free,
    status: active ? (user.subscriptionStatus || 'active') : planId === 'free' ? 'inactive' : 'expired',
    expiresAt: active ? user.subscriptionExpiresAt || null : null,
    renewalStatus: user.subscriptionRenewalStatus || 'not_applicable',
    provider: user.subscriptionProvider || null,
    providerCustomerId: user.subscriptionProviderCustomerId || null,
    providerPurchaseId: user.subscriptionProviderPurchaseId || null,
    startedAt: user.subscriptionStartedAt || null,
    entitlementId: user.subscriptionEntitlementId || null,
  };
}

export function monthKey(date = new Date()) {
  const value = new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function resetUsageIfNeeded(user) {
  const currentMonth = monthKey();
  if (user.usageMonth !== currentMonth) {
    user.usageMonth = currentMonth;
    user.voiceMinutesUsed = 0;
    user.videoCallsUsed = 0;
  }
}

export function canUseVideo(user) {
  const subscription = activeSubscription(user);
  resetUsageIfNeeded(user);
  const limit = subscription.plan.limits.monthlyVideoCalls;
  return limit === null || user.videoCallsUsed < limit;
}

export function entitlementPayload(user) {
  const subscription = activeSubscription(user);
  resetUsageIfNeeded(user);
  return {
    ...subscription,
    usage: {
      month: user.usageMonth,
      voiceMinutesUsed: user.voiceMinutesUsed || 0,
      videoCallsUsed: user.videoCallsUsed || 0,
    },
  };
}
