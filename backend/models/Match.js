import mongoose from 'mongoose';

const ballSchema = new mongoose.Schema({
  ballNumber: { type: Number, required: true },
  overNumber: { type: Number, required: true },
  batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  runs: { type: Number, default: 0, min: 0 },
  extras: { type: { type: String, enum: ['none', 'wide', 'noBall', 'bye', 'legBye'], default: 'none' }, runs: { type: Number, default: 0 } },
  isWicket: { type: Boolean, default: false },
  wicketType: { type: String, enum: ['none', 'bowled', 'caught', 'lbw', 'runOut', 'stumped', 'hitWicket', 'retired'], default: 'none' },
  // Fielding info for wickets
  fielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null }, // used for caught
  assistingFielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null }, // used for runOut
  isBoundary: { type: Boolean, default: false },
  isSix: { type: Boolean, default: false }
}, { _id: true });

const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true },
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  date: { type: Date, required: true },
  totalOvers: { type: Number, default: 20, min: 1 },
  playersPerTeam: { type: Number, default: 11 },
  venue: {
    type: String,
    trim: true,
    default: 'Narendra Modi Stadium',
    enum: [
      'Narendra Modi Stadium',
      'Wankhede Stadium',
      'Eden Gardens',
      'M. A. Chidambaram Stadium',
      'Arun Jaitley Stadium',
      // Back-compat for old scheduled matches
      'Night Cricket Ground'
    ]
  },
  status: { type: String, enum: ['upcoming', 'live', 'completed', 'abandoned'], default: 'upcoming' },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  result: { type: String, trim: true, default: '' },
  tossWinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  tossResult: { type: String, enum: ['heads', 'tails', null], default: null },
  decision: { type: String, enum: ['bat', 'field', null], default: null },
  targetScore: { type: Number, default: null },
  currentInnings: { type: Number, enum: [1, 2], default: 1 },
  scoreTeamA: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0, max: 10 },
    overs: { type: Number, default: 0 },
    balls: [ballSchema]
  },
  scoreTeamB: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0, max: 10 },
    overs: { type: Number, default: 0 },
    balls: [ballSchema]
  },
  live: {
    battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    striker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    currentInnings: { type: Number, enum: [1, 2], default: 1 }
  },
  // Selected bowlers for the bowling team (used for UI/validations)
  bowlingSquad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

matchSchema.pre('save', function (next) {
  if (this.teamA && this.teamB && this.teamA.toString() === this.teamB.toString()) {
    return next(new Error('Team A and Team B cannot be the same'));
  }
  next();
});

export default mongoose.model('Match', matchSchema);
