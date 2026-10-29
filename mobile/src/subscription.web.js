export async function configureSubscription() {
  return { available: false, reason: 'In-app purchases are unavailable on web.' };
}

export async function purchasePlan() {
  throw new Error('Use the App Store or Google Play app for in-app subscriptions.');
}

export async function restorePurchases() {
  throw new Error('Restore purchases is available in the native development build.');
}
