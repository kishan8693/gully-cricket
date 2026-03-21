import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function Players() {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamFilter, setTeamFilter] = useState(''); // '' => all players
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [form, setForm] = useState({ name: '', role: 'Batsman', teamId: '', jerseyNumber: '' });
  const [editForm, setEditForm] = useState({ name: '', role: 'Batsman', teamId: '', jerseyNumber: '' });
  const [editProfileImage, setEditProfileImage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Player card -> modal
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [playerModalLoading, setPlayerModalLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetailsCache, setPlayerDetailsCache] = useState({});
  const [playerDerivedStatsCache, setPlayerDerivedStatsCache] = useState({});

  const loadTeams = () => api.get('/teams').then(res => setTeams(res.data.data));
  const loadPlayers = (teamId) => {
    const url = teamId ? `/players?team=${teamId}` : '/players';
    return api.get(url).then(res => setPlayers(res.data.data));
  };

  useEffect(() => {
    loadTeams().catch(() => toast.error('Failed to load teams'));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPlayers(teamFilter)
      .catch(() => toast.error('Failed to load players'))
      .finally(() => setLoading(false));
  }, [teamFilter]);

  const deriveStatsFromDetail = useMemo(() => {
    return (detail) => {
      const perfs = detail?.performances || [];
      const matchesPlayed = perfs.length;
      const wickets = perfs.reduce((s, p) => s + (p?.bowling?.wickets || 0), 0);
      const overs = perfs.reduce((s, p) => s + (p?.bowling?.overs || 0), 0);
      const catches = perfs.reduce((s, p) => s + (p?.fielding?.catches || 0), 0);
      return { matchesPlayed, wickets, overs, catches };
    };
  }, []);

  const openPlayerModal = async (p) => {
    const pid = p?._id;
    if (!pid) return;

    setSelectedPlayerId(pid);
    setPlayerModalOpen(true);

    const cachedDetail = playerDetailsCache[pid];
    if (cachedDetail) {
      setSelectedPlayer(cachedDetail);
      return;
    }

    setPlayerModalLoading(true);
    try {
      const res = await api.get(`/players/${pid}`);
      const detail = res.data.data || res.data;
      setSelectedPlayer(detail);
      setPlayerDetailsCache(prev => ({ ...prev, [pid]: detail }));

      const derived = deriveStatsFromDetail(detail);
      setPlayerDerivedStatsCache(prev => ({ ...prev, [pid]: derived }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load player');
      setPlayerModalOpen(false);
    } finally {
      setPlayerModalLoading(false);
    }
  };

  const closePlayerModal = () => {
    setPlayerModalOpen(false);
    setSelectedPlayer(null);
    setSelectedPlayerId(null);
    setPlayerModalLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.teamId) { toast.error('Name and team required'); return; }
    setSaving(true);
    try {
      await api.post('/players', { ...form, jerseyNumber: form.jerseyNumber || undefined });
      toast.success('Player added');
      setShowModal(false);
      setForm({ name: '', role: 'Batsman', teamId: '', jerseyNumber: '' });
      loadPlayers(teamFilter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p) => {
    setEditingPlayer(p);
    setEditProfileImage(null);
    setEditForm({
      name: p.name || '',
      role: p.role || 'Batsman',
      teamId: p.teamId?._id || p.teamId || '',
      jerseyNumber: p.jerseyNumber ?? ''
    });
    setShowEditModal(true);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 px-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-100 truncate">Players</h2>
        {isAdmin && (
          <button type="button" className="btn btn-primary w-full sm:w-auto rounded-lg px-4 py-2 shrink-0" onClick={() => setShowModal(true)}>+ Add Player</button>
        )}
      </div>
      <div className="card rounded-xl shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex-1 min-w-[220px]">
            <label className="form-label mb-2">View</label>
            <select
              className="form-input"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">All players</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.shortName} - {t.name}</option>
              ))}
            </select>
          </div>
          <div className="text-xs sm:text-sm text-gray-400">
            Showing <span className="text-gray-200 font-semibold">{players.length}</span> player(s)
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {players.map(p => (
          <motion.div
            key={p._id}
            role="button"
            tabIndex={0}
            onClick={() => openPlayerModal(p)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openPlayerModal(p);
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.18 }}
            className="w-full min-h-0 sm:min-h-[170px] p-4 sm:p-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-md hover:shadow-xl transition duration-300 active:scale-[0.99] sm:hover:scale-[1.01] cursor-pointer flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-0"
          >
            <Link
              to={`/players/${p._id}`}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-1 min-w-0 w-full"
              onClick={(e) => {
                // Prevent navigation; we open the modal instead.
                e.preventDefault();
              }}
            >
              <div className="flex items-center gap-3 min-w-0 w-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold text-xs sm:text-base shadow-md ring-2 ring-white/10 overflow-hidden">
                  {p.profileImage ? (
                    <img
                      src={p.profileImage.startsWith('http') ? p.profileImage : (import.meta.env.DEV ? 'http://localhost:5000' : '') + p.profileImage}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{p.name?.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm sm:text-lg font-bold text-white truncate break-words max-w-full">{p.name}</div>
                    {(p?.isCaptain === true || p?.captain === true) && (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-500 text-black">C</span>
                    )}
                    {(p?.isViceCaptain === true || p?.viceCaptain === true) && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-500 text-white">VC</span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 break-words">
                    {p.teamId?.shortName} · {p.role}
                  </div>
                </div>
              </div>

              {(() => {
                const derived = playerDerivedStatsCache[p._id];
                const matchesPlayed = derived ? derived.matchesPlayed : '—';
                const wickets = derived ? derived.wickets : '—';
                return (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center w-full sm:w-auto sm:min-w-[160px] border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0">
                    <div>
                      <div className="text-xs text-gray-400">Runs</div>
                      <div className="text-sm font-semibold text-yellow-400">{p.totalRuns ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Wickets</div>
                      <div className="text-sm font-semibold text-blue-400">{wickets}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Matches</div>
                      <div className="text-sm font-semibold text-white">{matchesPlayed}</div>
                    </div>
                  </div>
                );
              })()}
            </Link>
            {isAdmin && (
              <button
                type="button"
                className="text-xs sm:text-sm px-4 py-2 rounded-lg w-full sm:w-auto bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(p);
                }}
              >
                Edit
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {playerModalOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={closePlayerModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-primary-900 rounded-xl p-4 sm:p-6 w-[90%] max-w-md max-h-[90vh] overflow-y-auto my-auto border border-white/10 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid grid-cols-[auto,1fr] gap-3 sm:gap-4 flex-1 items-start min-w-0">
                  <div className="p-[2px] rounded-full bg-gradient-to-r from-primary-600 to-amber-500 shadow-md ring-2 ring-white/10">
                    {selectedPlayer?.profileImage ? (
                      <img
                        src={selectedPlayer.profileImage.startsWith('http') ? selectedPlayer.profileImage : (import.meta.env.DEV ? 'http://localhost:5000' : '') + selectedPlayer.profileImage}
                        alt=""
                        className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-primary-700 flex items-center justify-center text-lg sm:text-2xl font-bold text-amber-400">
                        {(selectedPlayer?.name || '').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-sm sm:text-base font-semibold text-gray-100 truncate break-words">
                      {selectedPlayer?.name || 'Loading...'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400 break-words">
                      {(selectedPlayer?.teamId?.shortName || selectedPlayer?.teamId?.name || '-') + ' · ' + (selectedPlayer?.role || '')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closePlayerModal}
                  aria-label="Close player modal"
                >
                  ✕
                </button>
              </div>

              {playerModalLoading || !selectedPlayer ? (
                <div className="mt-5 flex items-center justify-center">
                  <div className="spinner" />
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 text-center text-xs sm:text-sm">
                    <div>
                      <div className="text-[11px] text-gray-400">Runs</div>
                      <div className="text-sm font-bold text-amber-400">{selectedPlayer?.totalRuns ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">Strike Rate</div>
                      <div className="text-sm font-bold text-gray-200">{selectedPlayer?.strikeRate ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">Matches</div>
                      <div className="text-sm font-bold text-gray-200">{playerDerivedStatsCache[selectedPlayerId]?.matchesPlayed ?? (selectedPlayer?.performances?.length || 0)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">Wickets</div>
                      <div className="text-sm font-bold text-cyan-400">{playerDerivedStatsCache[selectedPlayerId]?.wickets ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">Overs</div>
                      <div className="text-sm font-bold text-emerald-400">{playerDerivedStatsCache[selectedPlayerId]?.overs ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">Catches</div>
                      <div className="text-sm font-bold text-purple-300">{playerDerivedStatsCache[selectedPlayerId]?.catches ?? 0}</div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-5">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-200 mb-2 sm:mb-3">Match-wise performance</h3>
                    {(selectedPlayer?.performances || []).length === 0 ? (
                      <div className="text-gray-500 text-sm">No matches yet</div>
                    ) : (
                      <div className="overflow-x-auto -mx-1 px-1 max-w-full">
                        <table className="w-full min-w-[820px] text-xs sm:text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                              <th>Match</th>
                              <th className="text-center">Vs</th>
                              <th className="text-center">Bat R</th>
                              <th className="text-center">Bat B</th>
                              <th className="text-center">Bat 4s</th>
                              <th className="text-center">Bat 6s</th>
                              <th className="text-center">Bat SR</th>
                              <th className="text-center">Bowl O</th>
                              <th className="text-center">Bowl R</th>
                              <th className="text-center">Bowl W</th>
                              <th className="text-center">Bowl Econ</th>
                              <th className="text-center">Field C</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedPlayer?.performances || []).map((p, i) => (
                              <tr key={p.matchId?._id || i} className="border-b border-gray-700/50">
                                <td className="py-2">{`Match #${p.matchId?.matchNumber ?? '-'}`}</td>
                                <td className="text-center text-gray-300">{p.opponent?.shortName || p.opponent?.name || '-'}</td>
                                <td className="text-center">{p.batting?.runs ?? 0}</td>
                                <td className="text-center">{p.batting?.balls ?? 0}</td>
                                <td className="text-center">{p.batting?.fours ?? 0}</td>
                                <td className="text-center">{p.batting?.sixes ?? 0}</td>
                                <td className="text-center">
                                  {p.batting?.balls > 0 ? (p.batting?.strikeRate ?? 0).toFixed(1) : '-'}
                                </td>
                                <td className="text-center">{p.bowling?.overs ?? 0}</td>
                                <td className="text-center">{p.bowling?.runsConceded ?? 0}</td>
                                <td className="text-center">{p.bowling?.wickets ?? 0}</td>
                                <td className="text-center">
                                  {(p.bowling?.overs ?? 0) > 0
                                    ? ((p.bowling?.runsConceded ?? 0) / (p.bowling?.overs ?? 1)).toFixed(2)
                                    : '0.00'}
                                </td>
                                <td className="text-center">{p.fielding?.catches ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-md my-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Add Player</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Player name" />
              </div>
              <div>
                <label className="form-label">Team</label>
                <select className="form-input" value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))} required>
                  <option value="">Select team</option>
                  {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Jersey # (optional)</label>
                <input type="number" min="1" max="99" className="form-input" value={form.jerseyNumber} onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))} />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
                <button type="button" className="btn btn-ghost w-full sm:w-auto rounded-lg px-4 py-2" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-full sm:w-auto rounded-lg px-4 py-2" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-md my-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Edit Player</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editForm.name.trim() || !editForm.teamId) {
                  toast.error('Name and team are required');
                  return;
                }
                setSaving(true);
                try {
                  const fd = new FormData();
                  fd.append('name', editForm.name.trim());
                  fd.append('role', editForm.role);
                  fd.append('teamId', editForm.teamId);
                  if (editForm.jerseyNumber !== '') fd.append('jerseyNumber', String(editForm.jerseyNumber));
                  if (editProfileImage) fd.append('profileImage', editProfileImage);

                  await api.put(`/players/${editingPlayer._id}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  });
                  toast.success('Player updated');
                  setShowEditModal(false);
                  setEditingPlayer(null);
                  setEditProfileImage(null);
                  setEditForm({ name: '', role: 'Batsman', teamId: '', jerseyNumber: '' });
                  loadPlayers(teamFilter);
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to update');
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Team</label>
                <select
                  className="form-input"
                  value={editForm.teamId}
                  onChange={(e) => setEditForm(f => ({ ...f, teamId: e.target.value }))}
                  required
                >
                  <option value="">Select team</option>
                  {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-input" value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  {['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Jersey # (optional)</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  className="form-input"
                  value={editForm.jerseyNumber}
                  onChange={(e) => setEditForm(f => ({ ...f, jerseyNumber: e.target.value === '' ? '' : e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Profile image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={(e) => setEditProfileImage(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <button type="button" className="btn btn-ghost w-full sm:w-auto rounded-lg px-4 py-2" onClick={() => { setShowEditModal(false); setEditingPlayer(null); setEditProfileImage(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary w-full sm:w-auto rounded-lg px-4 py-2" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
