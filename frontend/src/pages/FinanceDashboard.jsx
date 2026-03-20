import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FinanceDashboard() {
  const { isAdmin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContribution, setShowContribution] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showExpenseEdit, setShowExpenseEdit] = useState(false);
  const [contForm, setContForm] = useState({ playerId: '', amount: '' });
  const [playerContribution, setPlayerContribution] = useState(null); // { entries: [...] }
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [expForm, setExpForm] = useState({ amount: '', description: '', category: 'other' });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingExpenseForm, setEditingExpenseForm] = useState({ amount: '', description: '' });
  const [players, setPlayers] = useState([]);
  const [saving, setSaving] = useState(false);

  const QUICK_AMOUNTS = [50, 40, 100, 120];

  const load = () => {
    api.get('/finance/summary').then(res => setSummary(res.data.data));
    api.get('/finance/contributions').then(res => setContributions(res.data.data || []));
    api.get('/finance/expenses').then(res => setExpenses(res.data.data || []));
    api.get('/players').then(res => setPlayers(res.data.data || []));
  };

  useEffect(() => { load(); setLoading(false); }, []);

  const allPlayerContributionRows = (() => {
    const totalsByPlayerId = {};

    // Prefer summary totals (includes player objects)
    if (summary?.playerContributions?.length) {
      for (const pc of summary.playerContributions) {
        const pid = pc?.player?._id || pc?.playerId?._id || pc?.playerId;
        if (!pid) continue;
        totalsByPlayerId[String(pid)] = pc.totalAmount || 0;
      }
    }

    // Also merge /finance/contributions totals
    for (const c of contributions || []) {
      const pid = c?.playerId?._id || c?.playerId;
      if (!pid) continue;
      totalsByPlayerId[String(pid)] = c.totalAmount || c.entries?.reduce((s, e) => s + (e.amount || 0), 0) || 0;
    }

    return (players || [])
      .map((p) => ({
        playerId: p._id,
        player: p,
        totalAmount: totalsByPlayerId[String(p._id)] || 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount || (a.player.name || '').localeCompare(b.player.name || ''));
  })();

  const openContributionForPlayer = async (playerId) => {
    setContForm({ playerId, amount: '' });
    setEditingEntryId(null);
    setEditingAmount('');
    setShowContribution(true);
    try {
      const res = await api.get(`/finance/contributions/${playerId}`);
      setPlayerContribution(res.data.data || null);
    } catch {
      setPlayerContribution(null);
    }
  };

  const refreshPlayerContribution = async (playerId) => {
    try {
      const res = await api.get(`/finance/contributions/${playerId}`);
      setPlayerContribution(res.data.data || null);
    } catch {
      setPlayerContribution(null);
    }
  };

  const handleUpdateContributionEntry = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!contForm.playerId || !editingEntryId) return;
    const amountNum = +editingAmount;
    if (!amountNum || amountNum < 1) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api.put(
        `/finance/contributions/${contForm.playerId}/entries/${editingEntryId}`,
        { amount: amountNum }
      );
      toast.success('Contribution updated');
      setEditingEntryId(null);
      setEditingAmount('');
      await refreshPlayerContribution(contForm.playerId);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContributionEntry = async (entryId) => {
    if (!isAdmin) return;
    if (!contForm.playerId) return;

    const ok = window.confirm('Delete this contribution entry?');
    if (!ok) return;

    setSaving(true);
    try {
      await api.delete(`/finance/contributions/${contForm.playerId}/entries/${entryId}`);
      toast.success('Contribution entry deleted');
      if (String(editingEntryId) === String(entryId)) {
        setEditingEntryId(null);
        setEditingAmount('');
      }
      await refreshPlayerContribution(contForm.playerId);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContribution = async (e) => {
    e.preventDefault();
    if (!contForm.playerId || !contForm.amount || +contForm.amount < 1) return;
    setSaving(true);
    try {
      await api.post(`/finance/contributions/${contForm.playerId}`, { amount: +contForm.amount });
      toast.success('Contribution added');
      setShowContribution(false);
      setContForm({ playerId: '', amount: '' });
      setPlayerContribution(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expForm.amount || +expForm.amount < 1 || !expForm.description.trim()) return;
    setSaving(true);
    try {
      await api.post('/finance/expenses', { ...expForm, amount: +expForm.amount });
      toast.success('Expense added');
      setShowExpense(false);
      setExpForm({ amount: '', description: '', category: 'other' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const openEditExpense = (expense) => {
    if (!expense?._id) return;
    setEditingExpenseId(expense._id);
    setEditingExpenseForm({
      amount: String(expense.amount ?? ''),
      description: expense.description ?? ''
    });
    setShowExpenseEdit(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!isAdmin || !editingExpenseId) return;
    const amountNum = +editingExpenseForm.amount;
    const description = (editingExpenseForm.description || '').trim();
    if (!amountNum || amountNum < 1 || description.length < 3) {
      toast.error('Enter valid amount and description');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/finance/expenses/${editingExpenseId}`, {
        amount: amountNum,
        description
      });
      toast.success('Expense updated');
      setShowExpenseEdit(false);
      setEditingExpenseId(null);
      setEditingExpenseForm({ amount: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!isAdmin || !expenseId) return;
    const ok = window.confirm('Delete this expense?');
    if (!ok) return;
    setSaving(true);
    try {
      await api.delete(`/finance/expenses/${expenseId}`);
      toast.success('Expense deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-100">Finance</h2>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => setShowContribution(true)}>+ Contribution</button>
            <button className="btn btn-secondary" onClick={() => setShowExpense(true)}>+ Expense</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-2xl font-bold text-emerald-400">₹{summary?.totalCollection ?? 0}</div>
          <div className="text-sm text-gray-400">Total Collection</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-red-400">₹{summary?.totalExpenses ?? 0}</div>
          <div className="text-sm text-gray-400">Total Expenses</div>
        </div>
        <div className="card">
          <div className={`text-2xl font-bold ${(summary?.remainingBalance ?? 0) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>₹{summary?.remainingBalance ?? 0}</div>
          <div className="text-sm text-gray-400">Remaining Balance</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Player contributions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-300 border-b border-gray-700/60">
                <th>Player</th>
                <th className="text-right">Total (₹)</th>
                {isAdmin && <th className="text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {allPlayerContributionRows.map((row) => (
                <tr key={row.playerId} className="border-b border-gray-700/50 hover:bg-white/5 transition">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-white/10 flex items-center justify-center text-amber-300 font-bold shadow-sm">
                        {row.player?.name?.slice(0, 2)?.toUpperCase() || '—'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-100 truncate">{row.player?.name || '—'}</div>
                        <div className="text-xs text-gray-500">{row.player?.teamId?.shortName || '—'} · {row.player?.role || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right font-mono text-amber-300">₹{row.totalAmount}</td>
                  {isAdmin && (
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm px-3"
                        onClick={() => {
                          openContributionForPlayer(row.playerId);
                        }}
                      >
                        + Add
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Expenses</h3>
        <div className="space-y-2">
          {(expenses || []).map(e => (
            <div
              key={e._id}
              className="flex justify-between items-center py-3 px-3 rounded-xl border border-white/10 bg-white/5"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{e.description}</div>
                <div className="text-gray-400 text-xs">{e.category}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-red-300 shrink-0">₹{e.amount}</span>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs sm:text-sm px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                      onClick={() => openEditExpense(e)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs sm:text-sm px-3 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                      onClick={() => handleDeleteExpense(e._id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showContribution && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 shadow-md">
            <h3 className="text-lg font-semibold mb-4">Add contribution</h3>
            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="form-label">Player</label>
                <select className="form-input" value={contForm.playerId} onChange={e => setContForm(f => ({ ...f, playerId: e.target.value }))} required>
                  <option value="">Select</option>
                  {players.map(p => <option key={p._id} value={p._id}>{p.name} ({p.teamId?.shortName})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Amount (₹)</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setContForm(f => ({ ...f, amount: String(amt) }))}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={contForm.amount}
                  onChange={e => setContForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Custom amount"
                />
                <div className="text-xs text-gray-500 mt-1">Quick pick or type your own.</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowContribution(false);
                    setPlayerContribution(null);
                    setEditingEntryId(null);
                    setEditingAmount('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
              </div>
            </form>

            {playerContribution?.entries?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-200 mb-3">Contribution history</h4>
                <div className="space-y-3">
                  {playerContribution.entries
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((entry) => {
                      const isEditing = String(entry._id) === String(editingEntryId);
                      return (
                        <div key={entry._id} className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-3 shadow-sm">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-gray-300">
                              ₹{entry.amount}{' '}
                              <span className="text-xs text-gray-500">
                                ({new Date(entry.date).toLocaleDateString('en-IN')})
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                              {isEditing ? (
                                <>
                                  <input
                                    type="number"
                                    min="1"
                                    className="form-input w-32"
                                    value={editingAmount}
                                    onChange={(e) => setEditingAmount(e.target.value)}
                                  />
                                  <button type="button" className="btn btn-success btn-sm" onClick={handleUpdateContributionEntry} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                      setEditingEntryId(null);
                                      setEditingAmount('');
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                      setEditingEntryId(entry._id);
                                      setEditingAmount(String(entry.amount ?? ''));
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDeleteContributionEntry(entry._id)}
                                    disabled={saving}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showExpense && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 shadow-md">
            <h3 className="text-lg font-semibold mb-4">Add expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="form-label">Amount (₹)</label>
                <input type="number" min="1" className="form-input" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input type="text" className="form-input" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Ground rent" required />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select className="form-input" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                  {['ground', 'equipment', 'food', 'transport', 'trophy', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowExpense(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 shadow-md">
            <h3 className="text-lg font-semibold mb-4">Edit expense</h3>
            <form onSubmit={handleUpdateExpense} className="space-y-4">
              <div>
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={editingExpenseForm.amount}
                  onChange={(ev) => setEditingExpenseForm(f => ({ ...f, amount: ev.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingExpenseForm.description}
                  onChange={(ev) => setEditingExpenseForm(f => ({ ...f, description: ev.target.value }))}
                  placeholder="e.g. Ground rent"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowExpenseEdit(false);
                    setEditingExpenseId(null);
                    setEditingExpenseForm({ amount: '', description: '' });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
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
