import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CommentaryFeed from '../components/CommentaryFeed';

function getLegalBalls(balls) {
  return (balls || []).filter(b => b.extras?.type !== 'wide' && b.extras?.type !== 'noBall');
}

function getId(v) {
  return v?._id || v || null;
}

function slotKindToClass(kind) {
  if (!kind) return 'bg-black/10 border-gray-700/50 text-gray-200';
  if (kind === 'pending') return 'bg-yellow-500/20 border-yellow-500/60 text-yellow-100';
  if (kind === 'dot') return 'bg-gray-500/25 border-gray-500/50 text-gray-200';
  if (kind === 'run') return 'bg-blue-500/25 border-blue-500/50 text-blue-100';
  if (kind === 'four') return 'bg-purple-500/25 border-purple-500/50 text-purple-200';
  if (kind === 'six') return 'bg-amber-400/25 border-amber-400/50 text-amber-200';
  if (kind === 'wicket') return 'bg-red-500/25 border-red-500/50 text-red-200';
  if (kind === 'overComplete') return 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300';
  return 'bg-black/10 border-gray-700/50 text-gray-200';
}

export default function LiveScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [matchResp, setMatchResp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Wicket modal state
  const [showWicket, setShowWicket] = useState(false);
  const [wicketType, setWicketType] = useState('bowled'); // bowled/caught/runOut/lbw
  const [newBatsmanId, setNewBatsmanId] = useState('');
  const [caughtFielderId, setCaughtFielderId] = useState('');
  const [runOutAssisterId, setRunOutAssisterId] = useState('');

  // Ball outcome modal state
  const [showBallOutcome, setShowBallOutcome] = useState(false);
  const [lockedSlotIndex, setLockedSlotIndex] = useState(null); // 0..5
  const [slotPreview, setSlotPreview] = useState({}); // optimistic coloring
  const [extraTypeModal, setExtraTypeModal] = useState(null); // 'wide'|'noBall'|'bye'|'legBye'
  const [extraRunsModal, setExtraRunsModal] = useState(0);

  // Bowler/batsman selection when needed
  const [newBowlerId, setNewBowlerId] = useState('');
  const [battingPlayers, setBattingPlayers] = useState([]);
  const [bowlingPlayers, setBowlingPlayers] = useState([]);
  const [commentary, setCommentary] = useState([]);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      setMatchResp(res.data);
    } catch {
      toast.error('Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCommentary = useCallback(() => {
    api.get(`/matches/${id}/commentary`)
      .then(res => setCommentary(res.data.data || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  useEffect(() => {
    if (!matchResp) return;
    fetchCommentary();
  }, [matchResp?._id, matchResp?.data?._id, fetchCommentary]);

  const matchDoc = matchResp?.data || matchResp?.matchInfo || {};
  const info = matchResp?.matchInfo || matchDoc || {};
  const live = matchResp?.live || matchDoc?.live || {};
  const score = matchResp?.score || {};
  const runRate = matchResp?.runRate || {};

  const bowlingSquadIds = useMemo(() => {
    const squad = matchDoc?.bowlingSquad;
    if (!Array.isArray(squad)) return [];
    return squad.map(String);
  }, [matchDoc?.bowlingSquad]);

  const isLive = info?.status === 'live';
  const isCompleted = info?.status === 'completed';
  const needsStriker = isLive && !live?.striker;
  const needsBowler = isLive && !live?.currentBowler;

  const teamAId = getId(matchDoc?.teamA);
  const teamBId = getId(matchDoc?.teamB);
  const tossWinnerId = getId(matchDoc?.tossWinner);
  const decision = matchDoc?.decision;

  const battingTeamId = getId(live?.battingTeam);
  const isTeamABatting = battingTeamId && teamAId ? battingTeamId.toString() === teamAId.toString() : false;

  const currentBallsAll = isTeamABatting ? (matchDoc?.scoreTeamA?.balls || []) : (matchDoc?.scoreTeamB?.balls || []);
  const legalBalls = useMemo(() => getLegalBalls(currentBallsAll), [currentBallsAll]);
  // Grid logic:
  // - If last legal ball finished an over, backend sets `currentBowler = null` (needsBowler=true).
  //   In that moment, show the just-finished over as "completed" (all green).
  // - Once the next bowler is set, show the next over grid for ball entry.
  const currentOverNumber = useMemo(() => {
    const len = legalBalls.length;
    if (len === 0) return 1;
    if (len % 6 === 0) {
      const completedOvers = len / 6;
      return needsBowler ? completedOvers : completedOvers + 1;
    }
    return Math.floor(len / 6) + 1;
  }, [legalBalls.length, needsBowler]);

  const legalBallsInOver = useMemo(() => legalBalls.filter(b => b.overNumber === currentOverNumber), [legalBalls, currentOverNumber]);
  const overCompleted = legalBallsInOver.length >= 6;
  const nextSlotIndex = overCompleted ? null : legalBallsInOver.length; // sequential

  const bowlerNameById = useMemo(() => new Map(bowlingPlayers.map(p => [String(p._id), p.name])), [bowlingPlayers]);
  const eligibleBowlers = useMemo(
    () => bowlingPlayers.filter(p => bowlingSquadIds.includes(String(p._id))),
    [bowlingPlayers, bowlingSquadIds]
  );

  const overBowlerByNumber = useMemo(() => {
    const map = {};
    for (const b of legalBalls) {
      if (!b?.overNumber) continue;
      const num = b.overNumber;
      if (map[num]) continue;
      map[num] = b?.bowler ? String(b.bowler) : null;
    }
    return map;
  }, [legalBalls]);

  const nextOverNumberForSelection = needsBowler ? currentOverNumber + 1 : currentOverNumber;
  const completedOverCount = Math.floor(legalBalls.length / 6);

  useEffect(() => {
    if (!battingTeamId) return;
    api.get(`/players?team=${battingTeamId}`).then(res => setBattingPlayers(res.data.data || [])).catch(() => {});
  }, [battingTeamId]);

  useEffect(() => {
    const bowlingTeamId = getId(live?.bowlingTeam);
    if (!bowlingTeamId) return;
    api.get(`/players?team=${bowlingTeamId}`).then(res => setBowlingPlayers(res.data.data || [])).catch(() => {});
  }, [live?.bowlingTeam?._id, live?.bowlingTeam]);

  const tossMessage = useMemo(() => {
    if (!tossWinnerId || !decision) return '';
    const winner = matchDoc?.tossWinner;
    const winnerName = winner?.shortName || winner?.name || 'Team';
    const choice = decision === 'bat' ? 'bat' : 'field';
    return `${winnerName} won the toss and chose to ${choice} first`;
  }, [decision, matchDoc?.tossWinner, tossWinnerId]);

  const firstInningsTeamId = useMemo(() => {
    if (!tossWinnerId || !decision || !teamAId || !teamBId) return null;
    return decision === 'bat' ? tossWinnerId : (tossWinnerId === teamAId ? teamBId : teamAId);
  }, [decision, teamAId, teamBId, tossWinnerId]);

  const firstInningsRuns = firstInningsTeamId
    ? (firstInningsTeamId.toString() === teamAId?.toString()
      ? (matchDoc?.scoreTeamA?.runs || 0)
      : (matchDoc?.scoreTeamB?.runs || 0))
    : 0;

  const firstInningsOvers = firstInningsTeamId
    ? (firstInningsTeamId.toString() === teamAId?.toString()
      ? (matchDoc?.scoreTeamA?.overs ?? 0)
      : (matchDoc?.scoreTeamB?.overs ?? 0))
    : 0;

  const runsNeeded = (isLive && live?.currentInnings === 2 && info?.targetScore != null)
    ? Math.max(0, info.targetScore - (score?.runs || 0))
    : null;

  const ballsRemaining = (isLive && live?.currentInnings === 2 && score?.balls != null)
    ? Math.max(0, ((info?.totalOvers || matchDoc?.totalOvers || 20) * 6) - score.balls)
    : null;

  const getSlotKind = (i) => {
    if (overCompleted) return 'overComplete';
    if (slotPreview?.[i]?.kind) return slotPreview[i].kind;
    const ball = legalBallsInOver[i];
    if (!ball) return null;
    if (ball.isWicket) return 'wicket';
    if (ball.isSix) return 'six';
    if (ball.isBoundary) return 'four';
    if ((ball.runs ?? 0) === 0) return 'dot';
    return 'run';
  };

  const recordNonWicketBall = async ({ runs, extraType = 'none' }) => {
    if (!isAdmin || sending) return;
    setSending(true);
    const consumesLegalBall = !['wide', 'noBall'].includes(extraType);
    try {
      await api.post(`/matches/${id}/ball`, { runs, extraType, isWicket: false });
      toast.success('Ball recorded');
      await fetchMatch();
      fetchCommentary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
      await fetchMatch();
      fetchCommentary();
    } finally {
      setSending(false);
      // Wide/No-ball do not consume an over slot (legal ball), so keep the same locked slot.
      if (consumesLegalBall) {
        setShowBallOutcome(false);
        setLockedSlotIndex(null);
        setSlotPreview({});
      }
      setExtraTypeModal(null);
      setExtraRunsModal(0);
    }
  };

  const confirmWicket = async () => {
    const wicketIdForApi = wicketType;
    if (wicketIdForApi === 'caught' && !caughtFielderId) {
      toast.error('Select fielder for caught wicket');
      return;
    }
    if (wicketIdForApi === 'runOut' && !runOutAssisterId) {
      toast.error('Select assisting fielder for run out wicket');
      return;
    }

    if (!isAdmin || sending) return;
    setSending(true);
    try {
      if (lockedSlotIndex != null) {
        setSlotPreview(prev => ({ ...prev, [lockedSlotIndex]: { kind: 'wicket' } }));
      }
      await api.post(`/matches/${id}/ball`, {
        runs: 0,
        isWicket: true,
        wicketType: wicketIdForApi,
        extraType: 'none',
        fielderId: wicketIdForApi === 'caught' ? caughtFielderId : undefined,
        assistingFielderId: wicketIdForApi === 'runOut' ? runOutAssisterId : undefined,
        newBatsmanId: newBatsmanId || undefined
      });
      toast.success('Wicket!');
      setShowWicket(false);
      setNewBatsmanId('');
      setCaughtFielderId('');
      setRunOutAssisterId('');
      await fetchMatch();
      fetchCommentary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
      await fetchMatch();
      fetchCommentary();
    } finally {
      setSending(false);
      setLockedSlotIndex(null);
      setSlotPreview({});
      setShowWicket(false);
    }
  };

  const setBowler = async () => {
    if (!newBowlerId) return toast.error('Select bowler');
    // Only allow selecting from the configured bowling squad.
    if (bowlingSquadIds.length > 0 && !bowlingSquadIds.includes(String(newBowlerId))) {
      return toast.error('Selected bowler is not in the bowling squad for this match');
    }
    try {
      setSending(true);
      await api.put(`/matches/${id}`, { 'live.currentBowler': newBowlerId });
      toast.success('Bowler set');
      await fetchMatch();
      setNewBowlerId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  const nextBatsman = async () => {
    if (!newBatsmanId) return toast.error('Select batsman');
    try {
      setSending(true);
      await api.post(`/matches/${id}/next-batsman`, { newBatsmanId });
      toast.success('Batsman in');
      setNewBatsmanId('');
      await fetchMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  const swapStrike = async () => {
    try {
      setSending(true);
      await api.post(`/matches/${id}/swap-strike`);
      await fetchMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  if (loading || !matchResp) return <div className="flex justify-center py-12"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/matches')}>← Matches</button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/matches/${id}`)}>Scorecard</button>
      </div>

      <div className="card text-center">
        {isLive && <span className="badge badge-red mb-2">● LIVE</span>}
        {isCompleted && <span className="badge badge-green mb-2">COMPLETED</span>}

        <div className="text-xl font-bold text-gray-100">
          {(matchDoc?.teamA?.shortName || 'Team A')} vs {(matchDoc?.teamB?.shortName || 'Team B')}
        </div>

        {tossMessage && <div className="text-gray-300 text-sm mt-1">{tossMessage}</div>}

        <div className="text-4xl font-bold text-amber-400 mt-2">
          {score?.runs || 0}
          <small className="text-xl text-gray-400">/{score?.wickets || 0}</small>
        </div>
        <div className="text-gray-400 text-sm">
          ({score?.overs ?? 0} / {info?.totalOvers || 20} overs)
        </div>

        {isLive && live?.currentInnings === 2 && firstInningsTeamId && (
          <div className="text-emerald-400 text-sm mt-1">
            {firstInningsTeamId.toString() === teamAId?.toString() ? 'Team A' : 'Team B'} scored {firstInningsRuns} runs in {firstInningsOvers} overs
          </div>
        )}

        {isLive && live?.currentInnings === 2 && runsNeeded != null && ballsRemaining != null && (
          <div className="text-cyan-400 text-sm mt-1">
            {(live?.battingTeam?.shortName || live?.battingTeam?.name || 'Team')} need {runsNeeded} runs in {Math.ceil(ballsRemaining / 6)} overs
            <span className="text-gray-400"> ({ballsRemaining} balls remaining)</span>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-2 text-sm">
          <span>CRR: <strong className="text-cyan-400">{runRate?.current != null ? runRate.current.toFixed(2) : '0.00'}</strong></span>
          {runRate?.required != null && (
            <span>
              RRR: <strong className="text-amber-400">{runRate.required === Infinity ? '∞' : runRate.required?.toFixed(2)}</strong>
            </span>
          )}
        </div>
      </div>

      {isLive && (
        <div className="card grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400">Striker</div>
            <div className="font-semibold">{live?.striker?.name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Non-striker</div>
            <div className="font-semibold">{live?.nonStriker?.name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Bowler</div>
            <div className="font-semibold">{live?.currentBowler?.name || '—'}</div>
          </div>
        </div>
      )}

      {isLive && live?.striker && live?.nonStriker && isAdmin && (
        <div className="text-center">
          <button className="btn btn-ghost btn-sm" onClick={swapStrike} disabled={sending}>🔄 Swap strike</button>
        </div>
      )}

      {needsStriker && !showWicket && (
        <div className="card border-amber-500/30">
          <h4 className="font-semibold mb-2">New batsman</h4>
          <select
            className="form-input max-w-xs inline-block mr-2"
            value={newBatsmanId}
            onChange={e => setNewBatsmanId(e.target.value)}
          >
            <option value="">Select</option>
            {battingPlayers.map(p => <option key={p._id} value={p._id}>#{p.jerseyNumber} {p.name}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!newBatsmanId || sending} onClick={nextBatsman}>Confirm</button>
        </div>
      )}

      {needsBowler && !showWicket && (
        <div className="card border-cyan-500/30">
          <h4 className="font-semibold mb-2">Bowler for Over #{nextOverNumberForSelection}</h4>

          {completedOverCount > 0 && (
            <div className="mb-3 text-xs text-gray-400">
              Previous overs:{" "}
              {Array.from({ length: completedOverCount }, (_, i) => i + 1).map((ov) => {
                const bid = overBowlerByNumber[ov];
                const name = bid ? bowlerNameById.get(bid) : null;
                return (
                  <span key={ov} className="mr-2">
                    {ov}:{name || '—'}
                  </span>
                );
              })}
            </div>
          )}

          {eligibleBowlers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {eligibleBowlers.map((p) => (
                <button
                  key={String(p._id)}
                  type="button"
                  className={`btn btn-sm ${newBowlerId === String(p._id) ? 'btn-success' : 'btn-ghost'}`}
                  onClick={() => setNewBowlerId(String(p._id))}
                >
                  #{p.jerseyNumber} {p.name}
                </button>
              ))}
            </div>
          )}

          <select
            className="form-input max-w-xs inline-block mr-2"
            value={newBowlerId}
            onChange={e => setNewBowlerId(e.target.value)}
          >
            <option value="">Select</option>
            {eligibleBowlers.length === 0 ? (
              <option value="" disabled>No eligible bowlers</option>
            ) : (
              eligibleBowlers.map(p => (
                <option key={String(p._id)} value={String(p._id)}>
                  #{p.jerseyNumber} {p.name}
                </option>
              ))
            )}
          </select>
          <button className="btn btn-primary" disabled={!newBowlerId || sending} onClick={setBowler}>Confirm</button>
        </div>
      )}

      {showBallOutcome && lockedSlotIndex != null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md border-gray-700">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="font-semibold text-gray-100">Ball {lockedSlotIndex + 1} outcome</h4>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowBallOutcome(false);
                  setLockedSlotIndex(null);
                  setSlotPreview({});
                  setExtraTypeModal(null);
                  setExtraRunsModal(0);
                }}
                disabled={sending}
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className="btn btn-secondary"
                disabled={sending}
                onClick={() => {
                  setSlotPreview(prev => ({ ...prev, [lockedSlotIndex]: { kind: 'dot' } }));
                  recordNonWicketBall({ runs: 0 });
                }}
              >
                Dot (0)
              </button>
              {[1, 2, 3].map(n => (
                <button key={n} className="btn btn-secondary" disabled={sending} onClick={() => { setSlotPreview(prev => ({ ...prev, [lockedSlotIndex]: { kind: 'run' } })); recordNonWicketBall({ runs: n }); }}>
                  {n}
                </button>
              ))}
              <button className="btn btn-secondary" disabled={sending} onClick={() => { setSlotPreview(prev => ({ ...prev, [lockedSlotIndex]: { kind: 'four' } })); recordNonWicketBall({ runs: 4 }); }}>
                Four (4)
              </button>
              <button className="btn btn-secondary" disabled={sending} onClick={() => { setSlotPreview(prev => ({ ...prev, [lockedSlotIndex]: { kind: 'six' } })); recordNonWicketBall({ runs: 6 }); }}>
                Six (6)
              </button>
            </div>

            <div className="mb-4">
              <h5 className="text-sm text-gray-300 mb-2">Extras (optional)</h5>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={sending}
                  onClick={() => { setExtraTypeModal('wide'); setExtraRunsModal(0); }}
                >
                  Wide
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={sending}
                  onClick={() => { setExtraTypeModal('noBall'); setExtraRunsModal(0); }}
                >
                  No ball
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={sending}
                  onClick={() => { setExtraTypeModal('bye'); setExtraRunsModal(1); }}
                >
                  Bye
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={sending}
                  onClick={() => { setExtraTypeModal('legBye'); setExtraRunsModal(1); }}
                >
                  Leg bye
                </button>
              </div>
            </div>

            {extraTypeModal && (
              <div className="rounded-lg border border-gray-700 p-3 mb-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm text-gray-200">
                    {extraTypeModal === 'wide' && 'Wide'}
                    {extraTypeModal === 'noBall' && 'No ball'}
                    {extraTypeModal === 'bye' && 'Bye'}
                    {extraTypeModal === 'legBye' && 'Leg bye'}
                    <span className="text-gray-400"> · runs</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={sending}
                    onClick={() => { setExtraTypeModal(null); setExtraRunsModal(0); }}
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={7}
                    className="form-input flex-1"
                    value={extraRunsModal}
                    onChange={(e) => setExtraRunsModal(Math.max(0, Math.min(7, Number(e.target.value || 0))))}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={sending}
                    onClick={() => recordNonWicketBall({ runs: extraRunsModal, extraType: extraTypeModal })}
                  >
                    Confirm
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  For Wide/No ball, this is runs off the bat (1 extra is added automatically).
                </p>
              </div>
            )}

            <button
              className="btn btn-danger w-full"
              disabled={sending}
              onClick={() => {
                setSlotPreview(prev => ({ ...prev, [lockedSlotIndex]: { kind: 'wicket' } }));
                setShowBallOutcome(false);
                setShowWicket(true);
              }}
            >
              Wicket
            </button>
          </div>
        </div>
      )}

      {showWicket && lockedSlotIndex != null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md border-red-500/30">
            <h4 className="text-lg font-semibold text-red-400 mb-3">Wicket</h4>

            <div className="mb-3">
              <label className="form-label">Dismissal type</label>
              <select className="form-input" value={wicketType} onChange={(e) => setWicketType(e.target.value)}>
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="runOut">Run Out</option>
                <option value="lbw">LBW</option>
              </select>
            </div>

            {wicketType === 'caught' && (
              <div className="mb-3">
                <label className="form-label">Fielder (catch holder)</label>
                <select className="form-input" value={caughtFielderId} onChange={(e) => setCaughtFielderId(e.target.value)}>
                  <option value="">Select fielder</option>
                  {bowlingPlayers.map(p => <option key={p._id} value={p._id}>#{p.jerseyNumber} {p.name}</option>)}
                </select>
              </div>
            )}

            {wicketType === 'runOut' && (
              <div className="mb-3">
                <label className="form-label">Assisting fielder</label>
                <select className="form-input" value={runOutAssisterId} onChange={(e) => setRunOutAssisterId(e.target.value)}>
                  <option value="">Select assisting fielder</option>
                  {bowlingPlayers.map(p => <option key={p._id} value={p._id}>#{p.jerseyNumber} {p.name}</option>)}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">New batsman (optional)</label>
              <select className="form-input" value={newBatsmanId} onChange={(e) => setNewBatsmanId(e.target.value)}>
                <option value="">No change now</option>
                {battingPlayers.map(p => <option key={p._id} value={p._id}>#{p.jerseyNumber} {p.name}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <button className="btn btn-danger flex-1" onClick={confirmWicket} disabled={sending}>
                Confirm wicket
              </button>
              <button
                className="btn btn-ghost"
                disabled={sending}
                onClick={() => {
                  setShowWicket(false);
                  setLockedSlotIndex(null);
                  setSlotPreview({});
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLive && isAdmin && !needsStriker && (
        <div className="card">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <div className="text-gray-400 text-xs">Over</div>
              <div className="text-xl font-bold text-gray-100">#{currentOverNumber}</div>
            </div>
            <div className="text-sm text-gray-400">
              {overCompleted ? <span className="text-emerald-400 font-semibold">Over complete</span> : <span>Next: ball {nextSlotIndex + 1}</span>}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const isDone = i < legalBallsInOver.length;
              const canPick = !overCompleted && nextSlotIndex != null && i === nextSlotIndex;
              const isThisLocked = lockedSlotIndex === i;
              const isDisabled = sending || showWicket || showBallOutcome || needsBowler || !canPick || (!isThisLocked && lockedSlotIndex != null);
              const kind = getSlotKind(i);
              return (
                <button
                  key={i}
                  className={`h-12 rounded-lg border text-sm font-bold ${slotKindToClass(kind)} ${isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110'}`}
                  disabled={isDisabled}
                  onClick={() => {
                    setLockedSlotIndex(i);
                    setSlotPreview(prev => ({ ...prev, [i]: { kind: 'pending' } }));
                    setShowBallOutcome(true);
                  }}
                  title={isDone ? 'Completed' : canPick ? 'Click to record' : 'Complete previous balls first'}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Wide/No ball/Bye/Leg bye are selected from the ball popup.
          </div>
        </div>
      )}

      {isCompleted && info?.result && (
        <div className="card text-center text-emerald-400">
          <div className="w-full flex justify-center items-center gap-2">
            <span className="match-win-firecracker">🎆</span>
            <span className="match-win-rocket">🚀</span>
            <span className="font-medium">🏆 {info.result}</span>
          </div>
        </div>
      )}

      <CommentaryFeed matchId={id} commentary={commentary} onRefresh={fetchCommentary} isAdmin={isAdmin} />
    </div>
  );
}
