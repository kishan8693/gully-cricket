import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  shortName: { type: String, required: true, trim: true, maxlength: 4 },
  logo: { type: String, default: null },
  primaryColor: { type: String, default: '#1a1a2e' },
  secondaryColor: { type: String, default: '#e94560' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

teamSchema.virtual('players', { ref: 'Player', localField: '_id', foreignField: 'teamId' });

export default mongoose.model('Team', teamSchema);
