import mongoose from 'mongoose';

const subscriptionEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const SubscriptionEvent = mongoose.models.SubscriptionEvent
  || mongoose.model('SubscriptionEvent', subscriptionEventSchema);
