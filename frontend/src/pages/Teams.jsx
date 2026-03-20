import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Teams() {
  const { isAdmin } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState('');
  const [form, setForm] = useState({ name: '', shortName: '', logo: '' });
  const [saving, setSaving] = useState(false);
  const KNOWN_TEAM_LOGOS = {
    'kolkata knight riders': 'https://upload.wikimedia.org/wikipedia/en/4/4c/Kolkata_Knight_Riders_Logo.svg',
    'chennai super kings': 'https://upload.wikimedia.org/wikipedia/en/2/2e/Chennai_Super_Kings_Logo.svg',
    'gujarat titans': 'https://upload.wikimedia.org/wikipedia/en/0/09/Gujarat_Titans_Logo.svg',
    'royal challengers bangalore': 'https://upload.wikimedia.org/wikipedia/en/4/49/Royal_Challengers_Bangalore_Logo.svg',
    rcb: 'https://upload.wikimedia.org/wikipedia/en/4/49/Royal_Challengers_Bangalore_Logo.svg'
  };

  const load = () => api.get('/teams').then(res => setTeams(res.data.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openAddModal = () => {
    setEditingTeamId('');
    setForm({ name: '', shortName: '', logo: '' });
    setShowModal(true);
  };

  const openEditModal = (team) => {
    setEditingTeamId(team._id);
    setForm({ name: team.name || '', shortName: team.shortName || '', logo: team.logo || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.shortName.trim()) { toast.error('Name and short name required'); return; }
    setSaving(true);
    try {
      if (editingTeamId) {
        await api.put(`/teams/${editingTeamId}`, form);
        toast.success('Team updated');
      } else {
        await api.post('/teams', form);
        toast.success('Team created');
      }
      setShowModal(false);
      setEditingTeamId('');
      setForm({ name: '', shortName: '', logo: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team) => {
    const ok = window.confirm(`Delete team "${team.name}"?`);
    if (!ok) return;
    try {
      await api.delete(`/teams/${team._id}`);
      toast.success('Team deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-100 truncate">Teams</h2>
        {isAdmin && (
          <button
            className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-medium transition"
            onClick={openAddModal}
          >
            + Add Team
          </button>
        )}
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(t => (
          <div
            key={t._id}
            className="w-full p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-md hover:shadow-xl hover:border-amber-500/30 hover:scale-[1.01] transition duration-300"
          >
            {isAdmin && (
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="text-sm px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                  onClick={() => openEditModal(t)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                  onClick={() => handleDelete(t)}
                >
                  Delete
                </button>
              </div>
            )}
            <Link to={`/teams/${t._id}`} className="flex items-center justify-between gap-4 mt-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-800 flex items-center justify-center border border-white/10 shadow-sm overflow-hidden">
                {(t.logo || KNOWN_TEAM_LOGOS[(t.name || '').toLowerCase()] || KNOWN_TEAM_LOGOS[(t.shortName || '').toLowerCase()]) ? (
                  <img
                    src={t.logo || KNOWN_TEAM_LOGOS[(t.name || '').toLowerCase()] || KNOWN_TEAM_LOGOS[(t.shortName || '').toLowerCase()]}
                    alt={`${t.name} logo`}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                  />
                ) : (
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg"
                    style={{ background: `linear-gradient(135deg, ${t.primaryColor || '#334155'}, ${t.secondaryColor || '#64748b'})` }}
                  >
                    {t.shortName}
                  </div>
                )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold text-gray-100 truncate break-words">{t.name}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-300">
                    <span>Matches: {t.matchesPlayed}</span>
                    <span>Won: {t.matchesWon}</span>
                    <span>Lost: {t.matchesLost}</span>
                    <span>Runs: {t.totalRuns}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Players: {t.players}/11</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editingTeamId ? 'Edit Team' : 'Add Team'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Team Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kolkata Knight Riders" />
              </div>
              <div>
                <label className="form-label">Short Name (max 4)</label>
                <input className="form-input" value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value.slice(0, 4) }))} placeholder="KKR" />
              </div>
              <div>
                <label className="form-label">Logo URL (optional)</label>
                <input className="form-input" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} placeholder="https://.../team-logo.png" />
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingTeamId(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editingTeamId ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
