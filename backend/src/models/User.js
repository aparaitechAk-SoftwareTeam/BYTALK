import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    profilePhotoUrl: { type: String, default: null, trim: true },
    bio: { type: String, default: '', trim: true, maxlength: 500 },
    country: { type: String, default: '', trim: true, maxlength: 80 },
    nativeLanguage: { type: String, default: '', trim: true, maxlength: 80 },
    learningLanguage: { type: String, default: 'English', trim: true, maxlength: 80 },
    level: { type: String, default: 'Beginner', trim: true, maxlength: 80 },
    practiceInterests: { type: [String], default: [] },
    streak: { type: Number, default: 1 },
    minutes: { type: Number, default: 0 },
    words: { type: Number, default: 0 },
    subscriptionPlan: { type: String, enum: ['free', 'plus', 'pro'], default: 'free' },
    subscriptionStatus: { type: String, default: 'inactive' },
    subscriptionExpiresAt: { type: Date, default: null },
    subscriptionRenewalStatus: { type: String, default: 'not_applicable' },
    subscriptionProvider: { type: String, default: null },
    subscriptionProviderCustomerId: { type: String, default: null },
    subscriptionProviderPurchaseId: { type: String, default: null },
    subscriptionEntitlementId: { type: String, default: null },
    subscriptionStartedAt: { type: Date, default: null },
    usageMonth: { type: String, default: null },
    voiceMinutesUsed: { type: Number, default: 0 },
    videoCallsUsed: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);

export function publicUser(user) {
  if (!user) return null;
  const value = typeof user.toObject === 'function' ? user.toObject() : user;
  const {
    passwordHash,
    email,
    _id,
    subscriptionPlan,
    subscriptionStatus,
    subscriptionExpiresAt,
    subscriptionRenewalStatus,
    subscriptionProvider,
    subscriptionProviderCustomerId,
    subscriptionProviderPurchaseId,
    subscriptionEntitlementId,
    subscriptionStartedAt,
    usageMonth,
    voiceMinutesUsed,
    videoCallsUsed,
    ...safe
  } = value;
  return {
    ...safe,
    id: String(value._id || value.id),
    profilePhotoUrl: value.profilePhotoUrl || null,
  };
}
