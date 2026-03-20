import express from 'express';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import Match from '../models/Match.js';
import Contribution from '../models/Contribution.js';
import Expense from '../models/Expense.js';
import PlayerPerformance from '../models/PlayerPerformance.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const [teams, matches, players, contributions, expenses] = await Promise.all([
      Team.find().lean(),
      Match.find().populate('teamA teamB winner', 'name shortName primaryColor').sort({ date: 1 }).lean(),
      Player.find({ isActive: true }).populate('teamId', 'name shortName').lean(),
      Contribution.find().lean(),
      Expense.find().lean()
    ]);
    const standings = await Promise.all(teams.map(async (team) => {
      const teamMatches = matches.filter(m =>
        m.status === 'completed' &&
        (m.teamA._id.toString() === team._id.toString() || m.teamB._id.toString() === team._id.toString())
      );
      let won = 0, lost = 0, totalRuns = 0;
      teamMatches.forEach(m => {
        const isA = m.teamA._id.toString() === team._id.toString();
        totalRuns += isA ? (m.scoreTeamA?.runs || 0) : (m.scoreTeamB?.runs || 0);
        if (m.winner) {
          if (m.winner._id.toString() === team._id.toString()) won++;
          else lost++;
        }
      });
      const playerCount = players.filter(p => p.teamId?._id?.toString() === team._id.toString()).length;
      return { team, matchesPlayed: teamMatches.length, won, lost, totalRuns, playerCount, points: won * 2 };
    }));
    standings.sort((a, b) => b.points - a.points || b.totalRuns - a.totalRuns);
    const playerIds = players.map(p => p._id);
    const perfs = await PlayerPerformance.find({ playerId: { $in: playerIds } }).lean();
    const playerStats = {};
    perfs.forEach(p => {
      const id = p.playerId.toString();
      if (!playerStats[id]) playerStats[id] = { runs: 0, fours: 0, sixes: 0 };
      playerStats[id].runs += p.runs || 0;
      playerStats[id].fours += p.fours || 0;
      playerStats[id].sixes += p.sixes || 0;
    });
    const topBatsmen = players.map(p => ({
      ...p,
      totalRuns: playerStats[p._id]?.runs || 0,
      totalFours: playerStats[p._id]?.fours || 0,
      totalSixes: playerStats[p._id]?.sixes || 0
    })).sort((a, b) => b.totalRuns - a.totalRuns).slice(0, 5);
    const totalCollection = contributions.reduce((s, c) => s + c.entries.reduce((a, e) => a + (e.amount || 0), 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const recentMatches = matches.filter(m => m.status === 'completed').slice(-3).reverse();
    const upcomingMatches = matches.filter(m => m.status === 'upcoming').slice(0, 3);
    res.json({
      success: true,
      data: {
        summary: {
          totalTeams: teams.length,
          totalPlayers: players.length,
          totalMatches: matches.length,
          completedMatches: matches.filter(m => m.status === 'completed').length,
          scheduledMatches: matches.filter(m => m.status === 'upcoming').length
        },
        standings,
        recentMatches,
        upcomingMatches,
        topBatsmen,
        financialSummary: { totalCollection, totalExpenses, remainingBalance: totalCollection - totalExpenses }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
