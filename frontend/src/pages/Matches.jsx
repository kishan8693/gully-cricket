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
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden px-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-100 truncate">Matches</h2>
        {isAdmin && <button type="button" className="btn btn-primary w-full sm:w-auto rounded-lg px-4 py-2 shrink-0" onClick={() => setShowAdd(true)}>+ Schedule Match</button>}
      </div>
      <div className="flex overflow-x-auto flex-nowrap gap-2 sm:gap-3 pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {['', 'upcoming', 'live', 'completed'].map(s => (
          <button type="button" key={s} className={`btn btn-sm shrink-0 whitespace-nowrap snap-start rounded-lg px-3 py-1.5 text-xs sm:text-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
        <div className="space-y-3 sm:space-y-4">
          {filtered.map(m => (
            <div
              key={m._id}
              className={`card rounded-xl shadow-md transition cursor-pointer hover:border-gray-500/60 ${m.status !== 'upcoming' ? 'hover:bg-primary-800/95' : ''} relative w-full p-3 sm:p-4 space-y-3 overflow-hidden`}
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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-0">
                <div className="flex items-center justify-between gap-2 pr-0 sm:pr-0 w-full sm:w-auto">
                  <span className="text-gray-400 text-xs sm:text-sm break-words">Match #{m.matchNumber}</span>
                  <span className={`badge text-[10px] sm:text-xs px-2 py-0.5 shrink-0 ${m.status === 'live' ? 'badge-red' : m.status === 'completed' ? 'badge-green' : 'badge-muted'} sm:static`}>
                    {m.status === 'live' ? '● LIVE' : m.status}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:justify-end mt-2 sm:mt-0">
                  {m.status === 'upcoming' && isAdmin && !m.tossWinner && (
                    <button type="button" className="btn btn-secondary btn-sm w-full sm:w-auto rounded-lg px-4 py-2" onClick={(e) => { e.stopPropagation(); setTossMatch(m); }}>🪙 Toss</button>
                  )}
                  {m.status === 'upcoming' && isAdmin && m.tossWinner && (
                    <button type="button" className="btn btn-success btn-sm w-full sm:w-auto rounded-lg px-4 py-2" onClick={(e) => { e.stopPropagation(); setStartMatch(m); }}>▶ Start</button>
                  )}
                  {m.status === 'live' && isAdmin && (
                    <button type="button" className="btn btn-success btn-sm w-full sm:w-auto rounded-lg px-4 py-2" onClick={(e) => { e.stopPropagation(); navigate(`/matches/${m._id}/live`); }}>Live Score</button>
                  )}
                  {(m.status === 'live' || m.status === 'completed') && (
                    <button type="button" className="btn btn-primary btn-sm w-full sm:w-auto rounded-lg px-4 py-2" onClick={(e) => { e.stopPropagation(); navigate(`/matches/${m._id}`); }}>Scorecard</button>
                  )}
                  {isAdmin && m.status !== 'abandoned' && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm w-full sm:w-auto rounded-lg px-4 py-2"
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
              <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:items-start md:gap-3">
                <div className="flex items-center gap-3 min-w-0 w-full justify-start order-1">
                  <div
                    className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md"
                    style={{ background: `linear-gradient(135deg, ${m.teamA?.primaryColor || '#475569'}, ${m.teamA?.secondaryColor || '#64748b'})` }}
                  >
                    {m.teamA?.shortName}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base text-gray-100 truncate break-words text-left">{m.teamA?.name}</div>
                    {m.status !== 'upcoming' && (
                      <div className="text-amber-400 font-mono text-xs sm:text-sm text-left break-words">
                        {m.scoreTeamA?.runs}/{m.scoreTeamA?.wickets} ({m.scoreTeamA?.overs} ov)
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center order-2 py-1 md:py-0">
                  <div className="text-gray-500 font-medium text-xs sm:text-sm">VS</div>
                  {m.tossWinner && m.decision && (
                    <div className="mt-2 text-gray-300 text-xs sm:text-sm leading-relaxed px-1">
                      {m.tossWinner?.name || m.tossWinner?.shortName} won the toss and chose to{' '}
                      {m.decision === 'bat' ? 'bat' : 'field'} first
                    </div>
                  )}
                  {m.status === 'completed' && m.result && (
                    <div className="mt-2 text-xs sm:text-sm text-emerald-400 w-full flex flex-wrap justify-center items-center gap-1 px-1">
                      <span className="match-win-firecracker mr-2">🎆</span>
                      <span className="match-win-rocket mr-2">🚀</span>
                      <span className="font-medium">{m.result}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 min-w-0 w-full justify-start order-3 md:justify-end">
                  <div className="min-w-0 flex-1 md:text-right md:order-1 order-2">
                    <div className="font-semibold text-sm sm:text-base text-gray-100 truncate break-words text-left md:text-right">{m.teamB?.name}</div>
                    {m.status !== 'upcoming' && (
                      <div className="text-amber-400 font-mono text-xs sm:text-sm text-left md:text-right break-words">
                        {m.scoreTeamB?.runs}/{m.scoreTeamB?.wickets} ({m.scoreTeamB?.overs} ov)
                      </div>
                    )}
                  </div>
                  <div
                    className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md order-1 md:order-2"
                    style={{ background: `linear-gradient(135deg, ${m.teamB?.primaryColor || '#475569'}, ${m.teamB?.secondaryColor || '#64748b'})` }}
                  >
                    {m.teamB?.shortName}
                  </div>
                </div>
              </div>
              {m.status === 'upcoming' && <div className="mt-2 text-xs sm:text-sm text-gray-400 break-words leading-relaxed">📅 {formatDate(m.date)} · {m.venue} · {m.totalOvers} overs</div>}
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-md my-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Schedule Match</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="form-label">Date & Time</label>
                <input type="datetime-local" className="form-input" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <button type="button" className="btn btn-ghost w-full sm:w-auto rounded-lg px-4 py-2" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-full sm:w-auto rounded-lg px-4 py-2" disabled={saving}>{saving ? 'Saving...' : 'Schedule'}</button>
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
