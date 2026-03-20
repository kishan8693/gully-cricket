import express from 'express';
import { body, validationResult } from 'express-validator';
import Contribution from '../models/Contribution.js';
import Expense from '../models/Expense.js';
import Player from '../models/Player.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/finance/contributions
router.get('/contributions', async (req, res) => {
  try {
    const list = await Contribution.find()
      .populate('playerId', 'name profileImage role teamId')
      .lean();
    const withTotal = list.map(c => ({
      ...c,
      totalAmount: c.entries.reduce((s, e) => s + (e.amount || 0), 0)
    }));
    const grandTotal = withTotal.reduce((s, c) => s + c.totalAmount, 0);
    res.json({ success: true, data: withTotal, grandTotal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/finance/contributions/:playerId
router.get('/contributions/:playerId', async (req, res) => {
  try {
    let c = await Contribution.findOne({ playerId: req.params.playerId })
      .populate('playerId', 'name profileImage role teamId')
      .lean();
    if (!c) c = { playerId: req.params.playerId, entries: [], totalAmount: 0 };
    else c.totalAmount = c.entries.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/finance/contributions/:playerId - admin
router.post('/contributions/:playerId', auth, adminOnly, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const player = await Player.findById(req.params.playerId);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    let c = await Contribution.findOne({ playerId: req.params.playerId });
    if (!c) c = new Contribution({ playerId: req.params.playerId, entries: [] });
    c.entries.push({ amount: req.body.amount, note: req.body.note || '' });
    await c.save();
    const totalAmount = c.entries.reduce((s, e) => s + (e.amount || 0), 0);
    res.status(201).json({ success: true, message: 'Contribution added', data: { ...c.toObject(), totalAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/finance/contributions/:playerId/entries/:entryId - admin
router.put('/contributions/:playerId/entries/:entryId', auth, adminOnly, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const c = await Contribution.findOne({ playerId: req.params.playerId });
    if (!c) return res.status(404).json({ success: false, message: 'Contribution record not found' });

    const entry = c.entries.id(req.params.entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Contribution entry not found' });

    entry.amount = req.body.amount;
    await c.save();

    const totalAmount = c.entries.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ success: true, message: 'Contribution updated', data: { ...c.toObject(), totalAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/finance/contributions/:playerId/entries/:entryId - admin
router.delete('/contributions/:playerId/entries/:entryId', auth, adminOnly, async (req, res) => {
  try {
    const c = await Contribution.findOne({ playerId: req.params.playerId });
    if (!c) return res.status(404).json({ success: false, message: 'Contribution record not found' });

    const beforeCount = c.entries.length;
    c.entries = c.entries.filter(e => String(e._id) !== String(req.params.entryId));

    if (c.entries.length === beforeCount) {
      return res.status(404).json({ success: false, message: 'Contribution entry not found' });
    }

    if (c.entries.length === 0) {
      await Contribution.findByIdAndDelete(c._id);
      return res.json({ success: true, message: 'Contribution entry deleted' });
    }

    await c.save();
    const totalAmount = c.entries.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ success: true, message: 'Contribution entry deleted', data: { ...c.toObject(), totalAmount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/finance/expenses
router.get('/expenses', async (req, res) => {
  try {
    const list = await Expense.find().sort({ date: -1 }).lean();
    const totalExpenses = list.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ success: true, data: list, totalExpenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/finance/expenses - admin
router.post('/expenses', auth, adminOnly, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount at least 1'),
  body('description').trim().isLength({ min: 3 }).withMessage('Description at least 3 chars'),
  body('category').optional().isIn(['ground', 'equipment', 'food', 'transport', 'trophy', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json({ success: true, message: 'Expense added', data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/finance/expenses/:id - admin
router.put('/expenses/:id', auth, adminOnly, [
  body('amount').optional().isFloat({ min: 1 }),
  body('description').optional().trim().isLength({ min: 3 })
], async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense updated', data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/finance/expenses/:id - admin
router.delete('/expenses/:id', auth, adminOnly, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/finance/summary
router.get('/summary', async (req, res) => {
  try {
    const [contributions, expenses] = await Promise.all([
      Contribution.find().populate('playerId', 'name teamId').lean(),
      Expense.find().lean()
    ]);
    const totalCollection = contributions.reduce((s, c) => s + c.entries.reduce((a, e) => a + (e.amount || 0), 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const remainingBalance = totalCollection - totalExpenses;
    const playerContributions = contributions.map(c => ({
      player: c.playerId,
      totalAmount: c.entries.reduce((a, e) => a + (e.amount || 0), 0),
      entryCount: c.entries.length
    })).sort((a, b) => b.totalAmount - a.totalAmount);
    res.json({
      success: true,
      data: {
        totalCollection,
        totalExpenses,
        remainingBalance,
        playerContributions,
        expenseBreakdown: expenses
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
