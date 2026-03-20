import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function CommentaryFeed({ matchId, commentary, onRefresh, isAdmin }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ over: 1, ball: 1, description: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.description.trim()) return;
    setSaving(true);
    try {
      await api.post(`/matches/${matchId}/commentary`, addForm);
      toast.success('Commentary added');
      setShowAdd(false);
      setAddForm({ over: 1, ball: 1, description: '' });
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-100">💬 Live Commentary</h3>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh}>Refresh</button>
          {isAdmin && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
          )}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto space-y-2">
        {commentary.length === 0 ? (
          <p className="text-gray-500 text-sm">No commentary yet</p>
        ) : (
          commentary.map(c => (
            <div key={c._id} className="flex gap-2 text-sm py-2 border-b border-gray-700/50 last:border-0">
              <span className="text-amber-400 font-mono shrink-0">{c.over}.{c.ball}</span>
              <span className="text-gray-300">{c.description}</span>
              {c.isAuto && <span className="badge badge-muted text-xs shrink-0">auto</span>}
            </div>
          ))
        )}
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="mt-4 p-3 bg-primary-900/50 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">Over</label>
              <input type="number" min="1" className="form-input" value={addForm.over} onChange={e => setAddForm(f => ({ ...f, over: +e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Ball</label>
              <input type="number" min="1" className="form-input" value={addForm.ball} onChange={e => setAddForm(f => ({ ...f, ball: +e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <input type="text" className="form-input" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Virat hit 4 runs against Bumrah" />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
