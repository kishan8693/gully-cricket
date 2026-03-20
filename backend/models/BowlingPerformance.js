import mongoose from 'mongoose';

const bowlingPerformanceSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  balls: { type: Number, default: 0, min: 0 },
  runsGiven: { type: Number, default: 0, min: 0 },
  wickets: { type: Number, default: 0, min: 0, max: 10 },
  wides: { type: Number, default: 0, min: 0 },
  noBalls: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

bowlingPerformanceSchema.index({ matchId: 1, bowlerId: 1 }, { unique: true });

export default mongoose.model('BowlingPerformance', bowlingPerformanceSchema);
