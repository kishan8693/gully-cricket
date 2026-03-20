import express from 'express';
import { body, validationResult } from 'express-validator';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import PlayerPerformance from '../models/PlayerPerformance.js';
import BowlingPerformance from '../models/BowlingPerformance.js';
import { auth, adminOnly } from '../middleware/auth.js';
import upload from '../middleware/uploadPlayer.js';
import { calculateOvers } from '../utils/matchUtils.js';

const router = express.Router();

// GET /api/players - all, optional ?team=id
router.get('/', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.team) filter.teamId = req.query.team;
    const players = await Player.find(filter).populate('teamId', 'name shortName primaryColor secondaryColor').lean();
    const withStats = await Promise.all(players.map(async (p) => {
      const perfs = await PlayerPerformance.find({ playerId: p._id }).lean();
      const totalRuns = perfs.reduce((s, x) => s + (x.runs || 0), 0);
      const totalFours = perfs.reduce((s, x) => s + (x.fours || 0), 0);
      const totalSixes = perfs.reduce((s, x) => s + (x.sixes || 0), 0);
      const totalBalls = perfs.reduce((s, x) => s + (x.balls || 0), 0);
      const strikeRate = totalBalls > 0 ? parseFloat(((totalRuns / totalBalls) * 100).toFixed(2)) : 0;
      return { ...p, totalRuns, totalFours, totalSixes, strikeRate };
    }));
    res.json({ success: true, data: withStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/players/:id - single with performances
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('teamId', 'name shortName primaryColor').lean();
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    const batPerfs = await PlayerPerformance.find({ playerId: player._id })
      .populate({
        path: 'matchId',
        select: 'matchNumber date teamA teamB',
        populate: [
          { path: 'teamA', select: 'name shortName' },
          { path: 'teamB', select: 'name shortName' }
        ]
      })
      .lean();

    const bowlPerfs = await BowlingPerformance.find({ bowlerId: player._id })
      .populate({
        path: 'matchId',
        select: 'matchNumber date teamA teamB',
        populate: [
          { path: 'teamA', select: 'name shortName' },
          { path: 'teamB', select: 'name shortName' }
        ]
      })
      .lean();

    // Merge match-wise batting + bowling + fielding (catches) into one table-friendly structure.
    const byMatch = new Map();

    const playerTeamId = player.teamId?._id?.toString?.() || player.teamId?.toString?.() || null;

    const getOpponentForMatch = (match) => {
      if (!match || !playerTeamId) return null;
      const teamAId = match.teamA?._id?.toString?.() || match.teamA?.toString?.() || null;
      const teamBId = match.teamB?._id?.toString?.() || match.teamB?.toString?.() || null;
      if (teamAId && teamAId === playerTeamId) {
        return match.teamB ? { _id: match.teamB._id, name: match.teamB.name, shortName: match.teamB.shortName } : null;
      }
      if (teamBId && teamBId === playerTeamId) {
        return match.teamA ? { _id: match.teamA._id, name: match.teamA.name, shortName: match.teamA.shortName } : null;
      }
      return null;
    };

    for (const b of batPerfs) {
      const key = b.matchId?._id?.toString() || b.matchId?.toString();
      if (!key) continue;
      byMatch.set(key, {
        matchId: b.matchId,
        opponent: getOpponentForMatch(b.matchId),
        batting: {
          runs: b.runs || 0,
          balls: b.balls || 0,
          fours: b.fours || 0,
          sixes: b.sixes || 0,
          strikeRate: b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(2)) : 0,
          dismissal: b.dismissal || 'not out'
        },
        bowling: {
          overs: 0,
          runsConceded: 0,
          wickets: 0
        },
        fielding: {
          catches: b.catches || 0
        }
      });
    }

    for (const bw of bowlPerfs) {
      const key = bw.matchId?._id?.toString() || bw.matchId?.toString();
      if (!key) continue;
      const curr = byMatch.get(key) || {
        matchId: bw.matchId,
        opponent: getOpponentForMatch(bw.matchId),
        batting: {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          dismissal: 'not out'
        },
        bowling: {
          overs: 0,
          runsConceded: 0,
          wickets: 0
        },
        fielding: {
          catches: 0
        }
      };

      const overs = calculateOvers(bw.balls);
      curr.bowling = {
        overs,
        runsConceded: bw.runsGiven || 0,
        wickets: bw.wickets || 0
      };

      byMatch.set(key, curr);
    }

    const performances = Array.from(byMatch.values()).sort((a, b) => {
      const an = a.matchId?.matchNumber || 0;
      const bn = b.matchId?.matchNumber || 0;
      return an - bn;
    });

    const totalRuns = batPerfs.reduce((s, x) => s + (x.runs || 0), 0);
    const totalFours = batPerfs.reduce((s, x) => s + (x.fours || 0), 0);
    const totalSixes = batPerfs.reduce((s, x) => s + (x.sixes || 0), 0);
    const totalBalls = batPerfs.reduce((s, x) => s + (x.balls || 0), 0);
    const strikeRate = totalBalls > 0 ? parseFloat(((totalRuns / totalBalls) * 100).toFixed(2)) : 0;

    res.json({ success: true, data: { ...player, performances, totalRuns, totalFours, totalSixes, strikeRate } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/players - admin
router.post('/', auth, adminOnly, upload.single('profileImage'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name at least 2 chars'),
  body('role').isIn(['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']).withMessage('Invalid role'),
  body('teamId').notEmpty().withMessage('Team required'),
  body('jerseyNumber').optional().isInt({ min: 1, max: 99 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const team = await Team.findById(req.body.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    const count = await Player.countDocuments({ teamId: req.body.teamId, isActive: true });
    if (count >= 11) return res.status(400).json({ success: false, message: 'Max 11 players per team' });
    const data = { ...req.body };
    if (req.file) data.profileImage = `/uploads/players/${req.file.filename}`;
    const player = new Player(data);
    await player.save();
    await player.populate('teamId', 'name shortName primaryColor secondaryColor');
    res.status(201).json({ success: true, message: 'Player added', data: player });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/players/:id - admin
router.put('/:id', auth, adminOnly, upload.single('profileImage'), [
  body('name').optional().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']),
  body('jerseyNumber').optional().isInt({ min: 1, max: 99 }),
  body('teamId').optional().notEmpty().withMessage('teamId is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    const update = { ...req.body };
    if (req.file) update.profileImage = `/uploads/players/${req.file.filename}`;

    // Enforce max 11 players per team (only when moving teams)
    const currentTeamId = player.teamId?.toString();
    const nextTeamId = (update.teamId || currentTeamId)?.toString();
    if (nextTeamId !== currentTeamId) {
      const teamExists = await Team.findById(nextTeamId);
      if (!teamExists) return res.status(404).json({ success: false, message: 'Team not found' });

      const count = await Player.countDocuments({
        teamId: nextTeamId,
        isActive: true,
        _id: { $ne: player._id }
      });
      if (count >= 11) {
        return res.status(400).json({ success: false, message: 'Max 11 players per team' });
      }
    }

    const updated = await Player.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('teamId', 'name shortName primaryColor secondaryColor');

    res.json({ success: true, message: 'Player updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/players/:id - admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, message: 'Player removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
