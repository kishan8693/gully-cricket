import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function StartMatchModal({ match, onClose, onSuccess }) {
  const [battingPlayers, setBattingPlayers] = useState([]);
  const [bowlingPlayers, setBowlingPlayers] = useState([]);
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState(''); // primary bowler
  const [selectedBowlerIds, setSelectedBowlerIds] = useState([]); // bowling squad (min 5)
  const [saving, setSaving] = useState(false);

  const tossWinnerId = match.tossWinner?._id || match.tossWinner;
  const teamAId = match.teamA?._id || match.teamA;
  const teamBId = match.teamB?._id || match.teamB;

  const battingTeamId = match.decision === 'bat'
    ? tossWinnerId
    : (tossWinnerId === teamAId ? teamBId : teamAId);
  const bowlingTeamId = match.decision === 'field'
    ? tossWinnerId
    : (tossWinnerId === teamAId ? teamBId : teamAId);

  useEffect(() => {
    if (!battingTeamId) return;
    api.get(`/players?team=${battingTeamId}`).then(res => setBattingPlayers(res.data.data || [])).catch(() => {});
  }, [battingTeamId]);

  useEffect(() => {
    if (!bowlingTeamId) return;
    api.get(`/players?team=${bowlingTeamId}`).then(res => setBowlingPlayers(res.data.data || [])).catch(() => {});
  }, [bowlingTeamId]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!strikerId || !nonStrikerId) {
      toast.error('Select striker and non-striker');
      return;
    }
    if (strikerId === nonStrikerId) {
      toast.error('Striker and non-striker must be different');
      return;
    }
    if (!bowlerId) {
      toast.error('Select a primary bowler');
      return;
    }
    if (!Array.isArray(selectedBowlerIds) || selectedBowlerIds.length !== 7) {
      toast.error('Select exactly 7 bowlers');
      return;
    }
    if (!selectedBowlerIds.includes(bowlerId)) {
      toast.error('Primary bowler must be selected in the bowling squad');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/matches/${match._id}/start`, { strikerId, nonStrikerId, bowlerId, bowlerIds: selectedBowlerIds });
      toast.success('Match started!');
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
        <h3 className="text-lg font-semibold mb-4">▶ Start Match #{match.matchNumber}</h3>
        <p className="text-gray-400 text-sm mb-4">Select opening batsmen and first bowler</p>
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="form-label">Striker (batting)</label>
            <select className="form-input" value={strikerId} onChange={e => setStrikerId(e.target.value)} required>
              <option value="">Select</option>
              {battingPlayers.map(p => <option key={p._id} value={p._id}>#{p.jerseyNumber} {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Non-striker (batting)</label>
            <select className="form-input" value={nonStrikerId} onChange={e => setNonStrikerId(e.target.value)} required>
              <option value="">Select</option>
              {battingPlayers.map(p => <option key={p._id} value={p._id}>#{p.jerseyNumber} {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Bowling squad (min 5)</label>
            <div className="max-h-44 overflow-y-auto rounded-md border border-gray-700 p-3">
              {bowlingPlayers.map(p => {
                const pid = String(p._id);
                const checked = selectedBowlerIds.includes(pid);
                const isPrimary = bowlerId === pid;
                return (
                  <label key={pid} className="flex items-center gap-3 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const pid = String(p._id);
                        const next = e.target.checked
                          ? [...selectedBowlerIds, pid]
                          : selectedBowlerIds.filter(x => x !== pid);
                        setSelectedBowlerIds(next);
                        // UX: auto-pick primary when user selects first bowler(s)
                        if (e.target.checked && !bowlerId) setBowlerId(pid);
                        // If user unchecks the primary, choose another selected bowler.
                        if (!e.target.checked && bowlerId === pid) setBowlerId(next[0] || '');
                      }}
                    />
                    <span className="text-gray-200 text-sm flex-1">#{p.jerseyNumber} {p.name}</span>
                    <button
                      type="button"
                      className={`btn btn-sm ${isPrimary ? 'btn-success' : 'btn-ghost'}`}
                      disabled={!checked}
                      onClick={() => setBowlerId(pid)}
                    >
                      {isPrimary ? 'Primary' : 'Set'}
                    </button>
                  </label>
                );
              })}
              {bowlingPlayers.length === 0 && <div className="text-gray-400 text-sm">No bowlers found.</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-success flex-1"
              disabled={
                saving ||
                !strikerId ||
                !nonStrikerId ||
                strikerId === nonStrikerId ||
                !bowlerId ||
                selectedBowlerIds.length < 5 ||
                !selectedBowlerIds.includes(bowlerId)
              }
            >
              {saving ? 'Starting...' : `Start Match (${selectedBowlerIds.length}/5)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
