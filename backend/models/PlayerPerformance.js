import mongoose from 'mongoose';

const playerPerformanceSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, default: 0, min: 0 },
  balls: { type: Number, default: 0, min: 0 },
  fours: { type: Number, default: 0, min: 0 },
  sixes: { type: Number, default: 0, min: 0 },
  // Fielding stat: catches taken by this player in this match
  catches: { type: Number, default: 0, min: 0 },
  dismissal: { type: String, trim: true, default: 'not out' }
}, { timestamps: true });

playerPerformanceSchema.index({ matchId: 1, playerId: 1 }, { unique: true });

playerPerformanceSchema.virtual('strikeRate').get(function () {
  if (!this.balls) return 0;
  return parseFloat(((this.runs / this.balls) * 100).toFixed(2));
});

export default mongoose.model('PlayerPerformance', playerPerformanceSchema);
