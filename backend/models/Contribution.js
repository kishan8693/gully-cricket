import mongoose from 'mongoose';

const contributionEntrySchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 1 },
  date: { type: Date, default: Date.now },
  note: { type: String, trim: true, default: '' }
}, { timestamps: true });

const contributionSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, unique: true },
  entries: [contributionEntrySchema]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

contributionSchema.virtual('totalAmount').get(function () {
  return this.entries.reduce((sum, e) => sum + (e.amount || 0), 0);
});

export default mongoose.model('Contribution', contributionSchema);
