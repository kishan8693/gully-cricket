import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TossModal from '../components/TossModal';
import StartMatchModal from '../components/StartMatchModal';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Matches() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ date: '', teamA: '', teamB: '', totalOvers: 20, venue: 'Narendra Modi Stadium' });
  const [tossMatch, setTossMatch] = useState(null);
  const [startMatch, setStartMatch] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/matches').then(res => setMatches(res.data.data));
    api.get('/teams').then(res => setTeams(res.data.data));
  };

  useEffect(() => { load(); setLoading(false); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.date || !addForm.teamA || !addForm.teamB) { toast.error('Date and both teams required'); return; }
    if (addForm.teamA === addForm.teamB) { toast.error('Select different teams'); return; }
    setSaving(true);
    try {
      await api.post('/matches', { ...addForm, date: new Date(addForm.date).toISOString() });
      toast.success('Match scheduled');
      setShowAdd(false);
      setAddForm({ date: '', teamA: '', teamB: '', totalOvers: 20, venue: 'Narendra Modi Stadium' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter
    ? matches.filter(m => m.status === filter)
    : matches.filter(m => ['upcoming', 'live', 'completed'].includes(m.status));

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-100">Matches</h2>
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Schedule Match</button>}
      </div>
      <div className="flex overflow-x-auto flex-nowrap gap-2 pb-1">
        {['', 'upcoming', 'live', 'completed'].map(s => (
          <button key={s} className={`btn btn-sm shrink-0 whitespace-nowrap ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
        <div className="space-y-4">
          {filtered.map(m => (
            <div
              key={m._id}
              className={`card transition cursor-pointer hover:border-gray-500/60 ${m.status !== 'upcoming' ? 'hover:bg-primary-800/95' : ''} relative w-full p-4 space-y-3 shadow-sm`}
              onClick={() => {
                if (m.status !== 'upcoming') navigate(`/matches/${m._id}`);
              }}
              role={m.status !== 'upcoming' ? 'button' : undefined}
              tabIndex={m.status !== 'upcoming' ? 0 : -1}
              onKeyDown={(e) => {
                if (m.status !== 'upcoming' && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  navigate(`/matches/${m._id}`);
                }
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-0">
                <span className="text-gray-400 text-sm pr-10 sm:pr-0 break-words">Match #{m.matchNumber}</span>
                <span className={`badge ${m.status === 'live' ? 'badge-red' : m.status === 'completed' ? 'badge-green' : 'badge-muted'} absolute top-2 right-2 sm:static sm:top-auto sm:right-auto`}>
                  {m.status === 'live' ? '● LIVE' : m.status}
                </span>
                <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto pt-1 sm:pt-0">
                  {m.status === 'upcoming' && isAdmin && !m.tossWinner && (
                    <button className="btn btn-secondary btn-sm w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); setTossMatch(m); }}>🪙 Toss</button>
                  )}
                  {m.status === 'upcoming' && isAdmin && m.tossWinner && (
                    <button className="btn btn-success btn-sm w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); setStartMatch(m); }}>▶ Start</button>
                  )}
                  {m.status === 'live' && isAdmin && (
                    <button className="btn btn-success btn-sm w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); navigate(`/matches/${m._id}/live`); }}>Live Score</button>
                  )}
                  {(m.status === 'live' || m.status === 'completed') && (
                    <button className="btn btn-primary btn-sm w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); navigate(`/matches/${m._id}`); }}>Scorecard</button>
                  )}
                  {isAdmin && m.status !== 'abandoned' && (
                    <button
                      className="btn btn-danger btn-sm w-full sm:w-auto"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = window.confirm('Cancel this match? This will keep player history in profiles.');
                        if (!ok) return;
                        try {
                          await api.delete(`/matches/${m._id}`);
                          toast.success('Match cancelled');
                          load();
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Failed to cancel match');
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-3">
                <div className="flex items-center gap-3 min-w-0 justify-center sm:justify-start w-full">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: `linear-gradient(135deg, ${m.teamA?.primaryColor || '#475569'}, ${m.teamA?.secondaryColor || '#64748b'})` }}
                  >
                    {m.teamA?.shortName}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-100 truncate text-center sm:text-left break-words">{m.teamA?.name}</div>
                    {m.status !== 'upcoming' && (
                      <div className="text-amber-400 font-mono text-center sm:text-left break-words">
                        {m.scoreTeamA?.runs}/{m.scoreTeamA?.wickets} ({m.scoreTeamA?.overs} ov)
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-gray-500 font-medium">VS</div>
                  {m.tossWinner && m.decision && (
                    <div className="mt-2 text-gray-300 text-sm leading-relaxed">
                      {m.tossWinner?.name || m.tossWinner?.shortName} won the toss and chose to{' '}
                      {m.decision === 'bat' ? 'bat' : 'field'} first
                    </div>
                  )}
                  {m.status === 'completed' && m.result && (
                    <div className="mt-2 text-sm text-emerald-400 w-full flex justify-center items-center">
                      <span className="match-win-firecracker mr-2">🎆</span>
                      <span className="match-win-rocket mr-2">🚀</span>
                      <span className="font-medium">{m.result}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-end gap-3 min-w-0 w-full">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-100 text-center sm:text-right truncate break-words">{m.teamB?.name}</div>
                    {m.status !== 'upcoming' && (
                      <div className="text-amber-400 font-mono text-center sm:text-right break-words">
                        {m.scoreTeamB?.runs}/{m.scoreTeamB?.wickets} ({m.scoreTeamB?.overs} ov)
                      </div>
                    )}
                  </div>
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: `linear-gradient(135deg, ${m.teamB?.primaryColor || '#475569'}, ${m.teamB?.secondaryColor || '#64748b'})` }}
                  >
                    {m.teamB?.shortName}
                  </div>
                </div>
              </div>
              {m.status === 'upcoming' && <div className="mt-2 text-sm text-gray-400 break-words">📅 {formatDate(m.date)} · {m.venue} · {m.totalOvers} overs</div>}
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Schedule Match</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="form-label">Date & Time</label>
                <input type="datetime-local" className="form-input" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Team A</label>
                  <select className="form-input" value={addForm.teamA} onChange={e => setAddForm(f => ({ ...f, teamA: e.target.value }))} required>
                    <option value="">Select</option>
                    {teams.map(t => <option key={t._id} value={t._id}>{t.shortName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Team B</label>
                  <select className="form-input" value={addForm.teamB} onChange={e => setAddForm(f => ({ ...f, teamB: e.target.value }))} required>
                    <option value="">Select</option>
                    {teams.filter(t => t._id !== addForm.teamA).map(t => <option key={t._id} value={t._id}>{t.shortName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Overs</label>
                  <input type="number" min="1" max="50" className="form-input" value={addForm.totalOvers} onChange={e => setAddForm(f => ({ ...f, totalOvers: +e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Venue</label>
                  <select className="form-input" value={addForm.venue} onChange={e => setAddForm(f => ({ ...f, venue: e.target.value }))}>
                    <option value="Narendra Modi Stadium">Narendra Modi Stadium</option>
                    <option value="Wankhede Stadium">Wankhede Stadium</option>
                    <option value="Eden Gardens">Eden Gardens</option>
                    <option value="M. A. Chidambaram Stadium">M. A. Chidambaram Stadium</option>
                    <option value="Arun Jaitley Stadium">Arun Jaitley Stadium</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {tossMatch && <TossModal match={tossMatch} teams={teams} onClose={() => setTossMatch(null)} onSuccess={() => { setTossMatch(null); load(); }} />}
      {startMatch && <StartMatchModal match={startMatch} onClose={() => setStartMatch(null)} onSuccess={() => { setStartMatch(null); load(); }} />}
    </div>
  );
}
