import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 1 },
  description: { type: String, required: true, trim: true, minlength: 3 },
  category: {
    type: String,
    enum: ['ground', 'equipment', 'food', 'transport', 'trophy', 'other'],
    default: 'other'
  },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
