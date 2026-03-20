import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  profileImage: { type: String, default: null },
  role: {
    type: String,
    required: true,
    enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']
  },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  jerseyNumber: { type: Number, min: 1, max: 99 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

playerSchema.virtual('totalRuns', {
  ref: 'PlayerPerformance',
  localField: '_id',
  foreignField: 'playerId',
  options: { match: {} },
  pipeline: [{ $group: { _id: null, total: { $sum: '$runs' } } }],
  transform: (v) => (v && v[0] ? v[0].total : 0)
});

export default mongoose.model('Player', playerSchema);
