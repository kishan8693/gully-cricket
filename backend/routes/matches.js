import express from 'express';
import { body, validationResult } from 'express-validator';
import Match from '../models/Match.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import PlayerPerformance from '../models/PlayerPerformance.js';
import BowlingPerformance from '../models/BowlingPerformance.js';
import Commentary from '../models/Commentary.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { calculateOvers, calculateCRR, calculateRRR } from '../utils/matchUtils.js';

const router = express.Router();

function getLegalBalls(balls) {
  return (balls || []).filter(b => b.extras?.type !== 'wide' && b.extras?.type !== 'noBall').length;
}

function generateCommentaryText(ball, batsmanName, bowlerName) {
  if (ball.isWicket) return `Wicket! ${batsmanName} out (${ball.wicketType}) off ${bowlerName}.`;
  if (ball.extras?.type === 'wide') return `Wide from ${bowlerName}.`;
  if (ball.extras?.type === 'noBall') return `No ball from ${bowlerName}, ${ball.runs} run(s).`;
  if (ball.isSix) return `${batsmanName} hits a six off ${bowlerName}!`;
  if (ball.isBoundary) return `${batsmanName} hits 4 runs off ${bowlerName}.`;
  if (ball.runs > 0) return `${batsmanName} scores ${ball.runs} run(s) off ${bowlerName}.`;
  return `${batsmanName} dot ball from ${bowlerName}.`;
}

function getBallTotalRuns(ball) {
  const extraRuns = ball?.extras?.runs || 0;
  return (ball?.runs || 0) + extraRuns;
}

function isLegalDelivery(ball) {
  return ball?.extras?.type !== 'wide' && ball?.extras?.type !== 'noBall';
}

async function ensureBowlingPerformancesFromBalls(match) {
  if (!match) return;
  const balls = [
    ...(match.scoreTeamA?.balls || []),
    ...(match.scoreTeamB?.balls || [])
  ];
  const bowlerIds = Array.from(
    new Set(balls.map(b => b?.bowler).filter(Boolean).map(String))
  );
  if (bowlerIds.length === 0) return;

  const players = await Player.find({ _id: { $in: bowlerIds } }).select('_id teamId').lean();
  const teamByBowlerId = new Map(players.map(p => [String(p._id), p.teamId]));

  const agg = new Map(); // bowlerId -> stats
  for (const b of balls) {
    const bid = b?.bowler ? String(b.bowler) : null;
    if (!bid) continue;
    if (!agg.has(bid)) {
      agg.set(bid, { balls: 0, runsGiven: 0, wickets: 0, wides: 0, noBalls: 0 });
    }
    const s = agg.get(bid);

    const totalRuns = getBallTotalRuns(b);
    const legal = isLegalDelivery(b);
    if (legal) s.balls += 1;
    s.runsGiven += totalRuns;

    if (b?.extras?.type === 'wide') s.wides += 1;
    if (b?.extras?.type === 'noBall') s.noBalls += 1;

    if (b?.isWicket) {
      // In cricket, runOut is not credited to bowler
      const wType = b?.wicketType || 'none';
      if (wType !== 'runOut') s.wickets += 1;
    }
  }

  // Upsert docs so scorecards always show all bowlers who actually bowled.
  for (const [bid, stats] of agg.entries()) {
    const teamId = teamByBowlerId.get(bid);
    if (!teamId) continue;
    await BowlingPerformance.findOneAndUpdate(
      { matchId: match._id, bowlerId: bid },
      {
        $set: {
          teamId,
          balls: stats.balls,
          runsGiven: stats.runsGiven,
          wickets: stats.wickets,
          wides: stats.wides,
          noBalls: stats.noBalls
        },
        $setOnInsert: {
          matchId: match._id,
          bowlerId: bid
        }
      },
      { upsert: true, new: true }
    );
  }
}

function translateWicketType(wicketType, lang) {
  const hi = {
    bowled: 'बोल्ड',
    caught: 'कैच आउट',
    lbw: 'लब डब्ल्यू',
    runOut: 'रन आउट',
    stumped: 'स्टंप्ड',
    hitWicket: 'हिट विकेट',
    retired: 'रेटायर्ड'
  };
  const gu = {
    bowled: 'બોલ્ડ',
    caught: 'કેચ આઉટ',
    lbw: 'LBW',
    runOut: 'રણઆઉટ',
    stumped: 'સ્ટમ્પ્ડ',
    hitWicket: 'હિટ વિકેટ',
    retired: 'રિટાયર્ડ'
  };
  if (lang === 'hi') return hi[wicketType] || wicketType;
  if (lang === 'gu') return gu[wicketType] || wicketType;
  return wicketType;
}

function translateCommentaryText(desc, lang) {
  if (!lang || lang === 'en') return desc;

  const s = (desc || '').trim();
  let m;

  // Wicket! X out (TYPE) off Y.
  m = s.match(/^Wicket! (.+) out \\((.+)\\) off (.+)\\.$/);
  if (m) {
    const batsman = m[1];
    const wType = m[2];
    const bowler = m[3];
    const typeTxt = translateWicketType(wType, lang);
    return lang === 'hi'
      ? `विकेट! ${batsman} आउट (${typeTxt}) ${bowler} की गेंद पर.`
      : `વિકેટ! ${batsman} આઉટ (${typeTxt}) ${bowler} ની સામે.`;
  }

  // Wide from Y.
  m = s.match(/^Wide from (.+)\\.$/);
  if (m) {
    const bowler = m[1];
    return lang === 'hi' ? `वाइड ${bowler} के द्वारा.` : `વાઈડ ${bowler} થી.`;
  }

  // No ball from Y, N run(s).
  m = s.match(/^No ball from (.+), (\\d+) run\\(s\\)\\.$/);
  if (m) {
    const bowler = m[1];
    const runs = m[2];
    return lang === 'hi' ? `नो बॉल ${bowler} के द्वारा, ${runs} रन.` : `નો બોલ ${bowler} થી, ${runs} રન.`;
  }

  // X hits a six off Y!
  m = s.match(/^(.+) hits a six off (.+)!$/);
  if (m) {
    const batsman = m[1];
    const bowler = m[2];
    return lang === 'hi'
      ? `${batsman} ने ${bowler} के खिलाफ छक्का लगाया!`
      : `${batsman} એ ${bowler} સામે સિક્સ ફટકારી!`;
  }

  // X hits 4 runs off Y.
  m = s.match(/^(.+) hits 4 runs off (.+)\\.$/);
  if (m) {
    const batsman = m[1];
    const bowler = m[2];
    return lang === 'hi'
      ? `${batsman} ने ${bowler} के खिलाफ 4 रन बनाए!`
      : `${batsman} એ ${bowler} સામે 4 રન કર્યા!`;
  }

  // X scores N run(s) off Y.
  m = s.match(/^(.+) scores (\\d+) run\\(s\\) off (.+)\\.$/);
  if (m) {
    const batsman = m[1];
    const runs = m[2];
    const bowler = m[3];
    return lang === 'hi'
      ? `${batsman} ने ${bowler} के खिलाफ ${runs} रन बनाए.`
      : `${batsman} એ ${bowler} સામે ${runs} રન બનાવ્યા.`;
  }

  // X dot ball from Y.
  m = s.match(/^(.+) dot ball from (.+)\\.$/);
  if (m) {
    const batsman = m[1];
    const bowler = m[2];
    return lang === 'hi'
      ? `${batsman} ${bowler} के खिलाफ डॉट गेंद.`
      : `${batsman} ${bowler} ની સામે ડોટ બોલ.`;
  }

  // Fallback: keep English for manual commentary / unknown formats.
  return desc;
}

async function storeCommentaryTranslationsForMatch(matchId) {
  const list = await Commentary.find({ matchId }).lean();
  if (!list || list.length === 0) return;

  const ops = [];
  for (const c of list) {
    const hiNeeds = !c.translations?.hi;
    const guNeeds = !c.translations?.gu;
    if (!hiNeeds && !guNeeds) continue;

    const nextTranslations = {
      hi: hiNeeds ? translateCommentaryText(c.description, 'hi') : (c.translations?.hi || ''),
      gu: guNeeds ? translateCommentaryText(c.description, 'gu') : (c.translations?.gu || '')
    };

    ops.push({
      updateOne: {
        filter: { _id: c._id },
        update: { $set: { translations: nextTranslations } }
      }
    });
  }

  if (ops.length > 0) {
    await Commentary.bulkWrite(ops);
  }
}

// GET /api/matches
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.team) filter.$or = [{ teamA: req.query.team }, { teamB: req.query.team }];
    const matches = await Match.find(filter)
      .populate('teamA teamB winner tossWinner', 'name shortName primaryColor secondaryColor')
      .sort({ date: 1 })
      .lean();
    res.json({ success: true, data: matches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/matches/:id - full detail for scorecard/live
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('teamA teamB winner tossWinner', 'name shortName primaryColor secondaryColor')
      .populate('live.battingTeam live.bowlingTeam', 'name shortName primaryColor')
      .populate('live.striker live.nonStriker live.currentBowler', 'name jerseyNumber role profileImage')
      .lean();
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Safety net: ensure bowling performance docs exist for every bowler who delivered a ball.
    // This fixes cases where old matches only show the primary bowler.
    await ensureBowlingPerformancesFromBalls(match);
    const currentInnings = match.live?.currentInnings || match.currentInnings || 1;
    const isTeamABatting = match.live?.battingTeam && match.live.battingTeam._id.toString() === match.teamA._id.toString();
    const battingScore = isTeamABatting ? match.scoreTeamA : match.scoreTeamB;
    const legalBalls = getLegalBalls(battingScore?.balls);
    const totalBalls = (match.totalOvers || 20) * 6;
    const crr = calculateCRR(battingScore?.runs || 0, legalBalls);
    let rrr = null;
    if (currentInnings === 2 && match.targetScore) {
      rrr = calculateRRR(match.targetScore, battingScore?.runs || 0, totalBalls - legalBalls);
    }
    const [teamABatting, teamBBatting, teamABowling, teamBBowling] = await Promise.all([
      PlayerPerformance.find({ matchId: match._id, teamId: match.teamA._id }).populate('playerId', 'name jerseyNumber role profileImage').sort({ createdAt: 1 }).lean(),
      PlayerPerformance.find({ matchId: match._id, teamId: match.teamB._id }).populate('playerId', 'name jerseyNumber role profileImage').sort({ createdAt: 1 }).lean(),
      BowlingPerformance.find({ matchId: match._id, teamId: match.teamA._id }).populate('bowlerId', 'name jerseyNumber role profileImage').sort({ createdAt: 1 }).lean(),
      BowlingPerformance.find({ matchId: match._id, teamId: match.teamB._id }).populate('bowlerId', 'name jerseyNumber role profileImage').sort({ createdAt: 1 }).lean()
    ]);
    const enrichBatting = (arr) => arr.map(e => ({ ...e, strikeRate: e.balls > 0 ? parseFloat(((e.runs / e.balls) * 100).toFixed(2)) : 0 }));
    const enrichBowling = (arr) => arr.map(e => ({ ...e, overs: calculateOvers(e.balls), economy: e.balls > 0 ? parseFloat((e.runsGiven / (e.balls / 6)).toFixed(2)) : 0 }));
    res.json({
      success: true,
      data: match,
      matchInfo: {
        _id: match._id,
        matchNumber: match.matchNumber,
        date: match.date,
        venue: match.venue,
        status: match.status,
        totalOvers: match.totalOvers,
        targetScore: match.targetScore,
        tossWinner: match.tossWinner,
        tossResult: match.tossResult,
        decision: match.decision,
        currentInnings,
        winner: match.winner,
        result: match.result
      },
      live: match.live ? { ...match.live, currentInnings } : null,
      score: {
        runs: battingScore?.runs || 0,
        wickets: battingScore?.wickets || 0,
        overs: battingScore?.overs ?? calculateOvers(legalBalls),
        balls: legalBalls
      },
      teamA: {
        info: match.teamA,
        score: { runs: match.scoreTeamA?.runs || 0, wickets: match.scoreTeamA?.wickets || 0, overs: match.scoreTeamA?.overs ?? calculateOvers(getLegalBalls(match.scoreTeamA?.balls)), balls: (match.scoreTeamA?.balls || []).length },
        batting: enrichBatting(teamABatting),
        bowling: enrichBowling(teamABowling)
      },
      teamB: {
        info: match.teamB,
        score: { runs: match.scoreTeamB?.runs || 0, wickets: match.scoreTeamB?.wickets || 0, overs: match.scoreTeamB?.overs ?? calculateOvers(getLegalBalls(match.scoreTeamB?.balls)), balls: (match.scoreTeamB?.balls || []).length },
        batting: enrichBatting(teamBBatting),
        bowling: enrichBowling(teamBBowling)
      },
      runRate: { current: crr, required: rrr }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches - admin
router.post('/', auth, adminOnly, [
  body('date').notEmpty().withMessage('Date required'),
  body('teamA').notEmpty().withMessage('Team A required'),
  body('teamB').notEmpty().withMessage('Team B required'),
  body('totalOvers').optional().isInt({ min: 1, max: 50 }),
  body('venue')
    .optional()
    .isIn([
      'Narendra Modi Stadium',
      'Wankhede Stadium',
      'Eden Gardens',
      'M. A. Chidambaram Stadium',
      'Arun Jaitley Stadium',
      // Back-compat for old scheduled matches
      'Night Cricket Ground'
    ]).withMessage('Invalid venue')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    if (req.body.teamA === req.body.teamB) return res.status(400).json({ success: false, message: 'Teams must be different' });
    const [ta, tb] = await Promise.all([Team.findById(req.body.teamA), Team.findById(req.body.teamB)]);
    if (!ta || !tb) return res.status(404).json({ success: false, message: 'Team not found' });
    const count = await Match.countDocuments();
    const match = new Match({
      ...req.body,
      matchNumber: count + 1,
      status: 'upcoming'
    });
    await match.save();
    await match.populate('teamA teamB', 'name shortName primaryColor secondaryColor');
    res.status(201).json({ success: true, message: 'Match created', data: match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/matches/:id - admin (general update, e.g. status)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('teamA teamB winner tossWinner', 'name shortName primaryColor secondaryColor');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, message: 'Match updated', data: match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches/:id/toss - admin (store tossWinner, tossResult, decision)
router.post('/:id/toss', auth, adminOnly, [
  body('tossWinner').notEmpty().withMessage('Toss winner team required'),
  body('tossResult').isIn(['heads', 'tails']).withMessage('tossResult must be heads or tails'),
  body('decision').isIn(['bat', 'field']).withMessage('decision must be bat or field')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'upcoming') return res.status(400).json({ success: false, message: 'Match already started' });
    const { tossWinner, tossResult, decision } = req.body;
    const battingTeam = decision === 'bat' ? tossWinner : (match.teamA.toString() === tossWinner ? match.teamB : match.teamA);
    const bowlingTeam = decision === 'field' ? tossWinner : (match.teamA.toString() === tossWinner ? match.teamB : match.teamA);
    match.tossWinner = tossWinner;
    match.tossResult = tossResult;
    match.decision = decision;
    match.live = match.live || {};
    match.live.battingTeam = battingTeam;
    match.live.bowlingTeam = bowlingTeam;
    match.live.currentInnings = 1;
    await match.save();
    await match.populate('teamA teamB tossWinner', 'name shortName primaryColor secondaryColor');
    const winnerName = match.tossWinner?.name || match.tossWinner?.shortName || 'Team';
    const choice = decision === 'bat' ? 'bat' : 'field';
    res.json({
      success: true,
      message: `${winnerName} won the toss and chose to ${choice} first`,
      data: match
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches/:id/start - admin (set striker, nonStriker, bowling squad)
router.post('/:id/start', auth, adminOnly, [
  body('strikerId').notEmpty().withMessage('Striker required'),
  body('nonStrikerId').notEmpty().withMessage('Non-striker required'),
  body('bowlerId').notEmpty().withMessage('Primary bowler required'),
  body('bowlerIds').isArray({ min: 5 }).withMessage('Select at least 5 bowlers'),
  body('bowlerIds.*').notEmpty().withMessage('Invalid bowler in bowling squad')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'upcoming') return res.status(400).json({ success: false, message: 'Match already started' });
    if (!match.tossWinner || !match.decision) return res.status(400).json({ success: false, message: 'Do toss first' });
    const { strikerId, nonStrikerId, bowlerId, bowlerIds } = req.body;
    if (strikerId === nonStrikerId) return res.status(400).json({ success: false, message: 'Striker and non-striker must be different' });
    if (!Array.isArray(bowlerIds) || bowlerIds.length < 5) {
      return res.status(400).json({ success: false, message: 'Select at least 5 bowlers before starting' });
    }
    if (!bowlerIds.map(String).includes(String(bowlerId))) {
      return res.status(400).json({ success: false, message: 'Primary bowler must be included in selected bowlers' });
    }

    match.live = match.live || {};
    match.live.striker = strikerId;
    match.live.nonStriker = nonStrikerId;
    match.live.currentBowler = bowlerId;
    match.live.battingTeam = match.live.battingTeam || (match.decision === 'bat' ? match.tossWinner : (match.teamA.toString() === match.tossWinner ? match.teamB : match.teamA));
    match.live.bowlingTeam = match.live.bowlingTeam || (match.decision === 'field' ? match.tossWinner : (match.teamA.toString() === match.tossWinner ? match.teamB : match.teamA));
    match.live.currentInnings = 1;
    match.bowlingSquad = bowlerIds;
    match.status = 'live';

    // Server-side validation: striker/non-striker must belong to batting team,
    // and bowling squad players must all belong to bowling team.
    const battingTeamId = match.live.battingTeam?.toString();
    const bowlingTeamId = match.live.bowlingTeam?.toString();
    const [strikerPlayer, nonStrikerPlayer] = await Promise.all([
      Player.findById(strikerId).select('teamId').lean(),
      Player.findById(nonStrikerId).select('teamId').lean()
    ]);
    if (!strikerPlayer || !nonStrikerPlayer) {
      return res.status(400).json({ success: false, message: 'Invalid striker/non-striker player' });
    }
    if (strikerPlayer.teamId.toString() !== battingTeamId || nonStrikerPlayer.teamId.toString() !== battingTeamId) {
      return res.status(400).json({ success: false, message: 'Striker and non-striker must be from batting team' });
    }

    const bowlers = await Player.find({ _id: { $in: bowlerIds } }).select('_id teamId').lean();
    if (bowlers.length !== bowlerIds.length) {
      return res.status(400).json({ success: false, message: 'One or more selected bowlers are invalid' });
    }
    const allBowlerTeamsMatch = bowlers.every(b => b.teamId.toString() === bowlingTeamId);
    if (!allBowlerTeamsMatch) {
      return res.status(400).json({ success: false, message: 'All selected bowlers must be from bowling team' });
    }

    await match.save();
    for (const id of [strikerId, nonStrikerId]) {
      await PlayerPerformance.findOneAndUpdate(
        { matchId: match._id, playerId: id },
        { $setOnInsert: { matchId: match._id, teamId: match.live.battingTeam, playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out' } },
        { upsert: true }
      );
    }
    // Pre-create bowling performance docs for every selected bowler.
    // This ensures scorecards/profile always show bowlers who were selected.
    for (const id of bowlerIds) {
      await BowlingPerformance.findOneAndUpdate(
        { matchId: match._id, bowlerId: id },
        {
          $setOnInsert: {
            matchId: match._id,
            teamId: match.live.bowlingTeam,
            bowlerId: id,
            balls: 0,
            runsGiven: 0,
            wickets: 0,
            wides: 0,
            noBalls: 0
          }
        },
        { upsert: true }
      );
    }
    await match.populate('live.striker live.nonStriker live.currentBowler live.battingTeam live.bowlingTeam', 'name shortName jerseyNumber role profileImage');
    res.json({ success: true, message: 'Match started', data: match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches/:id/ball - admin
router.post('/:id/ball', auth, adminOnly, [
  body('runs').isInt({ min: 0, max: 7 }).withMessage('Runs 0-7'),
  body('isWicket').optional().isBoolean(),
  body('extraType').optional().isIn(['wide', 'noBall', 'bye', 'legBye', 'none']),
  body('wicketType').optional().isIn(['bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket', 'retired']),
  body('fielderId').optional().isMongoId().withMessage('fielderId must be a valid player id'),
  body('assistingFielderId').optional().isMongoId().withMessage('assistingFielderId must be a valid player id'),
  body('newBatsmanId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') return res.status(400).json({ success: false, message: 'Match is not live' });
    if (!match.live?.striker || !match.live?.currentBowler) return res.status(400).json({ success: false, message: 'Set striker and bowler first' });
    const {
      runs = 0,
      isWicket = false,
      extraType = 'none',
      wicketType = 'none',
      fielderId = null,
      assistingFielderId = null,
      newBatsmanId = null
    } = req.body;
    const battingTeamId = match.live.battingTeam.toString();
    const isTeamABatting = battingTeamId === match.teamA.toString();
    const teamScore = isTeamABatting ? match.scoreTeamA : match.scoreTeamB;
    const isWide = extraType === 'wide';
    const isNoBall = extraType === 'noBall';
    const isLegal = !isWide && !isNoBall;

    // Wicket-specific validation (ensures dismissal details are complete)
    if (isWicket) {
      if (wicketType === 'caught' && !fielderId) {
        return res.status(400).json({ success: false, message: 'fielderId is required for caught wicket' });
      }
      if (wicketType === 'runOut' && !assistingFielderId) {
        return res.status(400).json({ success: false, message: 'assistingFielderId is required for run out wicket' });
      }
    }
    let totalRuns = runs;
    let extraRuns = 0;
    if (isWide) { extraRuns = 1; totalRuns = runs + 1; }
    else if (isNoBall) { extraRuns = 1; totalRuns = runs + 1; }
    const currentLegal = getLegalBalls(teamScore.balls);
    const overNum = Math.floor(currentLegal / 6) + 1;
    const ballEntry = {
      ballNumber: (teamScore.balls?.length || 0) + 1,
      overNumber: overNum,
      batsman: match.live.striker,
      bowler: match.live.currentBowler,
      runs,
      extras: { type: extraType || 'none', runs: extraRuns },
      isWicket,
      wicketType: isWicket ? wicketType : 'none',
      fielder: isWicket && wicketType === 'caught' ? fielderId : null,
      assistingFielder: isWicket && wicketType === 'runOut' ? assistingFielderId : null,
      isBoundary: runs === 4 && isLegal,
      isSix: runs === 6 && isLegal
    };
    teamScore.runs += totalRuns;
    if (isWicket) teamScore.wickets += 1;
    teamScore.balls = teamScore.balls || [];
    teamScore.balls.push(ballEntry);
    const newLegal = isLegal ? currentLegal + 1 : currentLegal;
    teamScore.overs = parseFloat((Math.floor(newLegal / 6) + (newLegal % 6) / 10).toFixed(1));
    if (isTeamABatting) match.scoreTeamA = teamScore; else match.scoreTeamB = teamScore;
    if (!['bye', 'legBye', 'wide'].includes(extraType)) {
      await PlayerPerformance.findOneAndUpdate(
        { matchId: match._id, playerId: match.live.striker },
        { $inc: { runs: runs, balls: isLegal ? 1 : (isNoBall ? 1 : 0), fours: ballEntry.isBoundary ? 1 : 0, sixes: ballEntry.isSix ? 1 : 0 } },
        { upsert: true, new: true, setDefaultsOnInsert: false }
      );
    } else if (extraType === 'bye' || extraType === 'legBye') {
      await PlayerPerformance.findOneAndUpdate(
        { matchId: match._id, playerId: match.live.striker },
        { $inc: { balls: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: false }
      );
    }
    await BowlingPerformance.findOneAndUpdate(
      { matchId: match._id, bowlerId: match.live.currentBowler },
      {
        $inc: {
          balls: isLegal ? 1 : 0,
          runsGiven: totalRuns,
          // In cricket, a 'run out' is not credited to the bowler.
          wickets: isWicket && wicketType !== 'runOut' ? 1 : 0,
          wides: isWide ? 1 : 0,
          noBalls: isNoBall ? 1 : 0
        },
        // Ensure required fields exist when upserting a new bowler.
        $setOnInsert: {
          matchId: match._id,
          teamId: match.live.bowlingTeam,
          bowlerId: match.live.currentBowler
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
    const [strikerDoc, bowlerDoc, fielderDoc, assistingFielderDoc] = await Promise.all([
      Player.findById(match.live.striker).select('name').lean(),
      Player.findById(match.live.currentBowler).select('name').lean(),
      (isWicket && wicketType === 'caught' && fielderId) ? Player.findById(fielderId).select('name').lean() : Promise.resolve(null),
      (isWicket && wicketType === 'runOut' && assistingFielderId) ? Player.findById(assistingFielderId).select('name').lean() : Promise.resolve(null)
    ]);
    const autoDesc = generateCommentaryText(ballEntry, strikerDoc?.name || 'Batsman', bowlerDoc?.name || 'Bowler');
    await Commentary.create({
      matchId: match._id,
      over: overNum,
      ball: ballEntry.ballNumber,
      batsman: match.live.striker,
      bowler: match.live.currentBowler,
      runs: totalRuns,
      description: autoDesc,
      isAuto: true
    });
    if (isWicket) {
      let dismissalString = wicketType || 'out';
      const bName = bowlerDoc?.name;
      if (wicketType === 'bowled' && bName) dismissalString = `b ${bName}`;
      if (wicketType === 'lbw' && bName) dismissalString = `lbw ${bName}`;

      if (wicketType === 'caught') {
        const fName = fielderDoc?.name;
        dismissalString = (fName && bName) ? `c ${fName} b ${bName}` : 'caught';
      }
      if (wicketType === 'runOut') {
        const afName = assistingFielderDoc?.name;
        dismissalString = afName ? `run out (${afName})` : 'run out';
      }

      await PlayerPerformance.findOneAndUpdate(
        { matchId: match._id, playerId: match.live.striker },
        { $set: { dismissal: dismissalString } }
      );

      // Fielding stat: caught wicket credits the fielder with a catch.
      if (wicketType === 'caught' && fielderId) {
        await PlayerPerformance.findOneAndUpdate(
          { matchId: match._id, playerId: fielderId },
          {
            $inc: { catches: 1 },
            $setOnInsert: {
              matchId: match._id,
              teamId: match.live.bowlingTeam,
              playerId: fielderId,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              dismissal: 'not out'
            }
          },
          { upsert: true, new: false }
        );
      }

      if (newBatsmanId) {
        match.live.striker = newBatsmanId;
        await PlayerPerformance.findOneAndUpdate(
          { matchId: match._id, playerId: newBatsmanId },
          { $setOnInsert: { matchId: match._id, teamId: match.live.battingTeam, playerId: newBatsmanId, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out' } },
          { upsert: true }
        );
      } else match.live.striker = null;
    }
    if (!isWicket && isLegal && runs % 2 !== 0) {
      const t = match.live.striker;
      match.live.striker = match.live.nonStriker;
      match.live.nonStriker = t;
    }
    if (isLegal && (currentLegal + 1) % 6 === 0) {
      const t = match.live.striker;
      match.live.striker = match.live.nonStriker;
      match.live.nonStriker = t;
      match.live.currentBowler = null;
    }
    const totalMatchBalls = (match.totalOvers || 20) * 6;
    let inningsOver = teamScore.wickets >= 10 || newLegal >= totalMatchBalls;
    let didComplete = false;
    if (inningsOver && match.live.currentInnings === 1) {
      match.live.currentInnings = 2;
      match.currentInnings = 2;
      match.targetScore = teamScore.runs + 1;
      const prevBat = match.live.battingTeam;
      match.live.battingTeam = match.live.bowlingTeam;
      match.live.bowlingTeam = prevBat;
      match.live.striker = null;
      match.live.nonStriker = null;
      match.live.currentBowler = null;
    } else if (match.live.currentInnings === 2 && match.targetScore && teamScore.runs >= match.targetScore) {
      match.status = 'completed';
      didComplete = true;
      const batTeam = await Team.findById(match.live.battingTeam);
      const wktRem = 10 - teamScore.wickets;
      match.winner = match.live.battingTeam;
      match.result = `${batTeam?.name || 'Team'} won by ${wktRem} wicket(s)`;
    } else if (inningsOver && match.live.currentInnings === 2) {
      match.status = 'completed';
      didComplete = true;
      const bowlTeam = await Team.findById(match.live.bowlingTeam);
      const runDiff = (match.targetScore - 1) - teamScore.runs;
      match.winner = match.live.bowlingTeam;
      match.result = `${bowlTeam?.name || 'Team'} won by ${runDiff} run(s)`;
    }
    await match.save();
    if (didComplete) {
      try {
        await storeCommentaryTranslationsForMatch(match._id);
      } catch (e) {
        console.error('Failed to store commentary translations:', e.message);
      }
    }
    const legalNow = getLegalBalls(isTeamABatting ? match.scoreTeamA.balls : match.scoreTeamB.balls);
    const crr = calculateCRR(teamScore.runs, legalNow);
    let rrr = null;
    if (match.live.currentInnings === 2 && match.targetScore) {
      rrr = calculateRRR(match.targetScore, teamScore.runs, totalMatchBalls - legalNow);
    }
    res.json({
      success: true,
      message: 'Ball recorded',
      data: {
        ball: ballEntry,
        score: { runs: teamScore.runs, wickets: teamScore.wickets, overs: teamScore.overs },
        live: match.live,
        runRate: { current: crr, required: rrr },
        matchComplete: match.status === 'completed'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches/:id/next-batsman - admin
router.post('/:id/next-batsman', auth, adminOnly, [body('newBatsmanId').notEmpty()], async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match || match.status !== 'live') return res.status(400).json({ success: false, message: 'Match not live' });
    if (match.live.striker) return res.status(400).json({ success: false, message: 'Striker already set' });
    match.live.striker = req.body.newBatsmanId;
    await match.save();
    await PlayerPerformance.findOneAndUpdate(
      { matchId: match._id, playerId: req.body.newBatsmanId },
      { $setOnInsert: { matchId: match._id, teamId: match.live.battingTeam, playerId: req.body.newBatsmanId, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out' } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Batsman set', data: { live: match.live } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches/:id/swap-strike - admin
router.post('/:id/swap-strike', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match || match.status !== 'live' || !match.live.striker || !match.live.nonStriker) {
      return res.status(400).json({ success: false, message: 'Cannot swap' });
    }
    const t = match.live.striker;
    match.live.striker = match.live.nonStriker;
    match.live.nonStriker = t;
    await match.save();
    res.json({ success: true, message: 'Strike swapped', data: { live: match.live } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/matches/:id/commentary
router.get('/:id/commentary', async (req, res) => {
  try {
    const lang = ['en', 'hi', 'gu'].includes(req.query.lang) ? req.query.lang : 'en';
    const list = await Commentary.find({ matchId: req.params.id })
      .populate('batsman bowler', 'name jerseyNumber')
      .sort({ over: 1, ball: 1 })
      .lean();

    const localized = list.map((c) => {
      let displayDescription = c.description;
      if (lang === 'hi') {
        displayDescription = c.translations?.hi || translateCommentaryText(c.description, 'hi');
      } else if (lang === 'gu') {
        displayDescription = c.translations?.gu || translateCommentaryText(c.description, 'gu');
      }
      return { ...c, displayDescription, lang };
    });

    res.json({ success: true, data: localized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matches/:id/commentary - admin (manual)
router.post('/:id/commentary', auth, adminOnly, [
  body('over').isInt({ min: 1 }).withMessage('Over required'),
  body('ball').isInt({ min: 1 }).withMessage('Ball required'),
  body('description').trim().notEmpty().withMessage('Description required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const comm = await Commentary.create({
      matchId: req.params.id,
      over: req.body.over,
      ball: req.body.ball,
      batsman: req.body.batsman || null,
      bowler: req.body.bowler || null,
      runs: req.body.runs ?? 0,
      description: req.body.description,
      isAuto: false
    });
    await comm.populate('batsman bowler', 'name jerseyNumber');
    res.status(201).json({ success: true, message: 'Commentary added', data: comm });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/matches/:id/commentary/:commId - admin (edit)
router.put('/:id/commentary/:commId', auth, adminOnly, [
  body('description').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const comm = await Commentary.findOneAndUpdate(
      { _id: req.params.commId, matchId: req.params.id },
      req.body,
      { new: true }
    ).populate('batsman bowler', 'name jerseyNumber');
    if (!comm) return res.status(404).json({ success: false, message: 'Commentary not found' });
    res.json({ success: true, message: 'Commentary updated', data: comm });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/matches/:id - admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Soft-cancel instead of hard delete.
    // This keeps PlayerPerformance/BowlingPerformance matchId references intact,
    // so player profiles won't lose history.
    match.status = 'abandoned';
    match.winner = null;
    match.result = '';
    await match.save();

    res.json({ success: true, message: 'Match cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
