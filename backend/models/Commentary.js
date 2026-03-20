import mongoose from 'mongoose';

const commentarySchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
  over: { type: Number, required: true },
  ball: { type: Number, required: true },
  batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  runs: { type: Number, default: 0 },
  description: { type: String, trim: true, required: true },
  // Optional translations stored after match completion.
  // We keep `description` as English and add cached translations.
  translations: {
    hi: { type: String, default: '' },
    gu: { type: String, default: '' }
  },
  isAuto: { type: Boolean, default: true }
}, { timestamps: true });

commentarySchema.index({ matchId: 1, over: 1, ball: 1 });

export default mongoose.model('Commentary', commentarySchema);
