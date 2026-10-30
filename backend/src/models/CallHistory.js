import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    tags: { type: [String], default: [] },
    comment: { type: String, default: '', maxlength: 1000 },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const callHistorySchema = new mongoose.Schema(
  {
    callId: { type: String, required: true, unique: true, index: true },
    callerId: { type: String, required: true, index: true },
    calleeId: { type: String, required: true, index: true },
    type: { type: String, enum: ['audio', 'video'], required: true },
    status: { type: String, enum: ['completed', 'missed', 'rejected', 'failed'], required: true },
    connectedAt: { type: Date, default: null },
    endedAt: { type: Date, required: true },
    durationSeconds: { type: Number, min: 0, default: 0 },
    feedback: { type: [feedbackSchema], default: [] },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false }
);

callHistorySchema.index({ createdAt: 1 }, { name: 'call_history_createdAt_ttl', expireAfterSeconds: 86400 });

export const CallHistory = mongoose.models.CallHistory
  || mongoose.model('CallHistory', callHistorySchema);
