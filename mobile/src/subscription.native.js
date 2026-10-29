import Purchases from 'react-native-purchases';

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

export async function configureSubscription(userId) {
  if (!apiKey) return { available: false, reason: 'RevenueCat public API key is not configured.' };
  await Purchases.configure({ apiKey, appUserID: String(userId) });
  return { available: true };
}

export async function purchasePlan(plan) {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages || [];
  const match = packages.find((item) => item.identifier === plan.id || item.product.identifier.includes(plan.id));
  if (!match) throw new Error(`The ${plan.name} product is not configured in RevenueCat.`);
  return Purchases.purchasePackage(match);
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}
