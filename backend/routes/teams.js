import express from 'express';
import { body, validationResult } from 'express-validator';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import Match from '../models/Match.js';
import PlayerPerformance from '../models/PlayerPerformance.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/teams - all (public)
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find().lean();
    const withStats = await Promise.all(teams.map(async (t) => {
      const players = await Player.countDocuments({ teamId: t._id, isActive: true });
      const completed = await Match.find({
        status: 'completed',
        $or: [{ teamA: t._id }, { teamB: t._id }]
      }).lean();
      let matchesPlayed = completed.length;
      let matchesWon = 0, matchesLost = 0, totalRuns = 0;
      completed.forEach(m => {
        const isA = m.teamA.toString() === t._id.toString();
        const runs = isA ? (m.scoreTeamA?.runs || 0) : (m.scoreTeamB?.runs || 0);
        totalRuns += runs;
        if (m.winner) {
          if (m.winner.toString() === t._id.toString()) matchesWon++;
          else matchesLost++;
        }
      });
      return { ...t, players, matchesPlayed, matchesWon, matchesLost, totalRuns };
    }));
    res.json({ success: true, data: withStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).lean();
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const players = await Player.find({ teamId: team._id, isActive: true })
      .populate('teamId', 'name shortName')
      .lean();

    const totalPlayers = players.length;

    // Attach player-wise totals for display (runs/fours/sixes/balls -> strike rate)
    const playerIds = players.map(p => p._id);
    const perfs = await PlayerPerformance.find({ playerId: { $in: playerIds } }).lean();
    const totalsByPlayer = {};
    for (const p of perfs) {
      const pid = p.playerId.toString();
      if (!totalsByPlayer[pid]) totalsByPlayer[pid] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      totalsByPlayer[pid].runs += p.runs || 0;
      totalsByPlayer[pid].balls += p.balls || 0;
      totalsByPlayer[pid].fours += p.fours || 0;
      totalsByPlayer[pid].sixes += p.sixes || 0;
    }

    const playersWithTotals = players
      .map(p => {
        const t = totalsByPlayer[p._id.toString()] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
        const strikeRate = t.balls > 0 ? parseFloat(((t.runs / t.balls) * 100).toFixed(2)) : 0;
        return { ...p, totalRuns: t.runs, totalFours: t.fours, totalSixes: t.sixes, strikeRate };
      })
      .sort((a, b) => (a.jerseyNumber || 999) - (b.jerseyNumber || 999));

    res.json({ success: true, data: { ...team, totalPlayers, players: playersWithTotals } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/teams - admin
router.post('/', auth, adminOnly, [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('shortName').trim().notEmpty().isLength({ max: 4 }).withMessage('Short name max 4 chars')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const team = new Team(req.body);
    await team.save();
    res.status(201).json({ success: true, message: 'Team created', data: team });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Team name exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/teams/:id - admin
router.put('/:id', auth, adminOnly, [
  body('name').optional().trim().notEmpty(),
  body('shortName').optional().trim().isLength({ max: 4 })
], async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, message: 'Team updated', data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/teams/:id - admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const count = await Player.countDocuments({ teamId: req.params.id });
    if (count > 0) return res.status(400).json({ success: false, message: 'Remove players first' });
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
