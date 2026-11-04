import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    durationDays: {
      type: Number,
      required: true,
      default: 30,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    savings: {
      type: String,
      default: '',
      trim: true,
    },
    badge: {
      type: String,
      default: null,
      trim: true,
    },
    badgeColor: {
      type: String,
      default: '#EA580C',
      trim: true,
    },
    badgeBg: {
      type: String,
      default: '#FFEDD5',
      trim: true,
    },
    unitText: {
      type: String,
      default: '',
      trim: true,
    },
    features: {
      type: [String],
      default: [
        'Unlimited AI Partner practice with ARYA',
        'HD 1-on-1 Video Calling',
        'All interview & daily conversation topics',
        'Priority matching with global speakers',
        'One-time payment, no autopay',
      ],
    },
    limits: {
      monthlyVoiceMinutes: { type: Number, default: null },
      monthlyVideoCalls: { type: Number, default: null },
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);
