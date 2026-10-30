import mongoose from 'mongoose';

const practiceSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    mode: { type: String, enum: ['ai', 'real'], required: true },
    topic: { type: String, required: true },
    language: { type: String, default: 'English' },
    level: { type: String, default: 'Beginner' },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    durationSeconds: { type: Number, min: 0, required: true },
    messageCount: { type: Number, min: 0, required: true },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, versionKey: false }
);

export const PracticeSession = mongoose.models.PracticeSession
  || mongoose.model('PracticeSession', practiceSessionSchema);
