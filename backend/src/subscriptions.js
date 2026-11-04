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

export const DEFAULT_PRO_PLANS = [
  {
    id: '1year',
    name: '1 Year',
    duration: '1 Year',
    durationDays: 365,
    price: 1399,
    originalPrice: 6000,
    savings: 'Save 77%',
    badge: 'Most Valued',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    unitText: '/Year',
    order: 1,
    active: true,
    features: [
      'Unlimited ARYA AI conversations',
      'HD 1-on-1 Video Calling with native speakers',
      'All interview preparation topics',
      'No autopay, 1-year full access',
      'Priority matching & zero wait time',
    ],
  },
  {
    id: '3months',
    name: '3 Months',
    duration: '3 Months',
    durationDays: 90,
    price: 699,
    originalPrice: 1500,
    savings: 'Save 53%',
    badge: 'Most Popular',
    badgeColor: '#EA580C',
    badgeBg: '#FFEDD5',
    unitText: '/3 Months',
    order: 2,
    active: true,
    features: [
      'Unlimited ARYA AI conversations',
      'HD 1-on-1 Video Calling',
      'All daily & business topics',
      'One-time payment, no autopay',
      'Priority matching',
    ],
  },
  {
    id: '1month',
    name: '1 Month',
    duration: '1 Month',
    durationDays: 30,
    price: 399,
    originalPrice: 500,
    savings: 'Save 20%',
    badge: null,
    badgeColor: '#6B7280',
    badgeBg: '#F3F4F6',
    unitText: '/Month',
    order: 3,
    active: true,
    features: [
      'Unlimited ARYA AI conversations',
      'HD 1-on-1 Video Calling',
      'All topics unlocked',
      'One-time payment',
    ],
  },
];

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
  return limit === null || (user.videoCallsUsed || 0) < limit;
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
