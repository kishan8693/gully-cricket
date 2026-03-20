import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function TossModal({ match, teams, onClose, onSuccess }) {
  const [phase, setPhase] = useState('flip'); // 'flip' | 'result' | 'choose'
  const [flipping, setFlipping] = useState(false);
  const [tossResult, setTossResult] = useState(null); // 'heads' | 'tails'
  const [coinFace, setCoinFace] = useState('heads'); // visual during flip
  const [winnerId, setWinnerId] = useState('');
  const [decision, setDecision] = useState('bat'); // 'bat' | 'field'
  const [saving, setSaving] = useState(false);

  const teamA = teams.find(t => t._id === match.teamA?._id || t._id === match.teamA);
  const teamB = teams.find(t => t._id === match.teamB?._id || t._id === match.teamB);

  const winnerName = teams.find(t => t._id === winnerId)?.name || teams.find(t => t._id === winnerId)?.shortName || '';
  const electedText = decision === 'bat' ? 'bat first' : 'field first';

  const doFlip = () => {
    setFlipping(true);

    // Use crypto randomness to feel more "real"
    const rand = new Uint32Array(1);
    window.crypto.getRandomValues(rand);
    const result = rand[0] % 2 === 0 ? 'heads' : 'tails';

    // Quick face toggling during animation
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed > 1500) return;
      setCoinFace((prev) => (prev === 'heads' ? 'tails' : 'heads'));
    }, 120);

    setTimeout(() => {
      clearInterval(interval);
      setCoinFace(result);
      setTossResult(result);
      setFlipping(false);
      setPhase('result');
    }, 1500);
  };

  const confirmChoice = () => {
    if (!winnerId) { toast.error('Select toss winner'); return; }
    setPhase('choose');
  };

  const submitToss = async () => {
    setSaving(true);
    try {
      if (!tossResult) {
        toast.error('Flip the coin first');
        return;
      }
      if (!winnerId) {
        toast.error('Select toss winner');
        return;
      }
      await api.post(`/matches/${match._id}/toss`, {
        tossWinner: winnerId,
        tossResult,
        decision
      });
      toast.success(`${winnerName} won the toss and elected to ${electedText}.`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">🪙 Toss - Match #{match.matchNumber}</h3>

        {phase === 'flip' && (
          <>
            <p className="text-gray-400 text-sm mb-4">Click to flip the coin</p>
            <div
              className={`mx-auto w-24 h-24 rounded-full border-4 border-amber-500 bg-amber-400/20 flex items-center justify-center text-2xl font-bold text-amber-400 cursor-pointer select-none transition-transform duration-300 hover:scale-105 ${flipping ? 'toss-coin-anim' : ''}`}
              onClick={!flipping ? doFlip : undefined}
            >
              {flipping ? (coinFace === 'heads' ? 'H' : 'T') : (coinFace === 'heads' ? 'H' : 'T')}
            </div>
            <p className="text-center text-gray-500 text-sm mt-2">Click coin to flip</p>
          </>
        )}

        {phase === 'result' && (
          <>
            <p className="text-center text-xl font-bold text-amber-400 capitalize mb-4">
              Toss result: {tossResult}
            </p>
            <p className="text-gray-400 text-sm mb-4">Select which team won the toss</p>
            <div className="space-y-2">
              {[teamA, teamB].filter(Boolean).map(t => (
                <button
                  key={t._id}
                  type="button"
                  className={`w-full py-3 rounded-lg border-2 transition ${winnerId === t._id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-600 text-gray-300 hover:border-gray-500'}`}
                  onClick={() => setWinnerId(t._id)}
                >
                  {t.shortName} - {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary flex-1" onClick={confirmChoice} disabled={!winnerId}>Next</button>
            </div>
          </>
        )}

        {phase === 'choose' && (
          <>
            <p className="text-gray-400 text-sm mb-4">Toss winner: <strong className="text-gray-200">{teams.find(t => t._id === winnerId)?.name}</strong>. They chose to:</p>
            {winnerId && (
              <p className="text-center text-gray-300 text-sm mb-4">
                {winnerName} won the toss and elected to {electedText}.
              </p>
            )}
            <div className="flex gap-4 mb-4">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer" style={{ borderColor: decision === 'bat' ? '#f59e0b' : '#475569', background: decision === 'bat' ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
                <input type="radio" name="decision" checked={decision === 'bat'} onChange={() => setDecision('bat')} className="sr-only" />
                <span>Bat first</span>
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer" style={{ borderColor: decision === 'field' ? '#f59e0b' : '#475569', background: decision === 'field' ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
                <input type="radio" name="decision" checked={decision === 'field'} onChange={() => setDecision('field')} className="sr-only" />
                <span>Field first</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setPhase('result')}>Back</button>
              <button type="button" className="btn btn-primary flex-1" onClick={submitToss} disabled={saving}>{saving ? 'Saving...' : 'Confirm Toss'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
