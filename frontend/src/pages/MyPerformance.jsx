import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatMatchDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyPerformance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = user?.id || user?._id;

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setError('User not found.');
        setLoading(false);
        return;
      }
      try {
        // Primary path: if userId also exists in Player collection.
        const res = await api.get(`/players/${userId}`);
        setPlayer(res.data.data);
      } catch {
        try {
          // Fallback path: map logged-in username to player name.
          const listRes = await api.get('/players');
          const players = listRes.data.data || [];
          const uname = (user?.username || '').trim().toLowerCase();
          const matched = players.find((p) => (p?.name || '').trim().toLowerCase() === uname);
          if (!matched?._id) {
            setError('Player profile not linked for this user.');
            return;
          }
          const profileRes = await api.get(`/players/${matched._id}`);
          setPlayer(profileRes.data.data);
        } catch (err2) {
          setError(err2.response?.data?.message || 'Failed to load performance');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, user?.username]);

  const totals = useMemo(() => {
    const perfs = player?.performances || [];
    const matchesPlayed = perfs.length;
    const totalRuns = perfs.reduce((s, p) => s + (p?.batting?.runs || 0), 0);
    const totalBalls = perfs.reduce((s, p) => s + (p?.batting?.balls || 0), 0);
    const totalFours = perfs.reduce((s, p) => s + (p?.batting?.fours || 0), 0);
    const totalSixes = perfs.reduce((s, p) => s + (p?.batting?.sixes || 0), 0);
    const totalWickets = perfs.reduce((s, p) => s + (p?.bowling?.wickets || 0), 0);
    const totalCatches = perfs.reduce((s, p) => s + (p?.fielding?.catches || 0), 0);
    const totalOvers = perfs.reduce((s, p) => s + (p?.bowling?.overs || 0), 0);
    const totalRunsConceded = perfs.reduce((s, p) => s + (p?.bowling?.runsConceded || 0), 0);
    const strikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : '0.00';
    const bowlingEconomy = totalOvers > 0 ? (totalRunsConceded / totalOvers).toFixed(2) : '0.00';
    return {
      matchesPlayed,
      totalRuns,
      totalBalls,
      totalFours,
      totalSixes,
      totalWickets,
      totalCatches,
      totalOvers: totalOvers.toFixed(1),
      totalRunsConceded,
      strikeRate,
      bowlingEconomy
    };
  }, [player]);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;

  if (error || !player) {
    return (
      <div className="space-y-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Dashboard</button>
        <div className="card text-gray-400">{error || 'Performance not found'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-100">My Performance</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>My Profile</button>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">{player.name} ({player.teamId?.shortName || player.teamId?.name || '-'})</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><div className="text-gray-400">Matches</div><div className="text-xl font-bold text-amber-400">{totals.matchesPlayed}</div></div>
          <div><div className="text-gray-400">Runs</div><div className="text-xl font-bold text-emerald-400">{totals.totalRuns}</div></div>
          <div><div className="text-gray-400">Wickets</div><div className="text-xl font-bold text-cyan-400">{totals.totalWickets}</div></div>
          <div><div className="text-gray-400">Catches</div><div className="text-xl font-bold text-purple-300">{totals.totalCatches}</div></div>
          <div><div className="text-gray-400">Strike Rate</div><div className="text-xl font-bold text-gray-200">{totals.strikeRate}</div></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-4">
          <div><div className="text-gray-400">Fours</div><div className="font-semibold">{totals.totalFours}</div></div>
          <div><div className="text-gray-400">Sixes</div><div className="font-semibold">{totals.totalSixes}</div></div>
          <div><div className="text-gray-400">Overs</div><div className="font-semibold">{totals.totalOvers}</div></div>
          <div><div className="text-gray-400">Runs Conceded</div><div className="font-semibold">{totals.totalRunsConceded}</div></div>
          <div><div className="text-gray-400">Eco</div><div className="font-semibold">{totals.bowlingEconomy}</div></div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Match-wise Performance</h3>
        {(player.performances || []).length === 0 ? (
          <p className="text-gray-500 text-sm">No matches played yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th>Match</th>
                  <th className="text-center">Date</th>
                  <th className="text-center">My Team</th>
                  <th className="text-center">Vs</th>
                  <th className="text-center">Runs(B)</th>
                  <th className="text-center">4s/6s</th>
                  <th className="text-center">SR</th>
                  <th className="text-center">O-R-W</th>
                  <th className="text-center">Catches</th>
                </tr>
              </thead>
              <tbody>
                {player.performances.map((p, i) => (
                  <tr key={p.matchId?._id || i} className="border-b border-gray-700/50">
                    <td className="py-2">#{p.matchId?.matchNumber ?? '-'}</td>
                    <td className="text-center">{formatMatchDate(p.matchId?.date)}</td>
                    <td className="text-center">{player.teamId?.shortName || '-'}</td>
                    <td className="text-center">{p.opponent?.shortName || p.opponent?.name || '-'}</td>
                    <td className="text-center">{p.batting?.runs ?? 0} ({p.batting?.balls ?? 0})</td>
                    <td className="text-center">{p.batting?.fours ?? 0}/{p.batting?.sixes ?? 0}</td>
                    <td className="text-center">{p.batting?.balls > 0 ? (p.batting?.strikeRate ?? 0).toFixed(1) : '-'}</td>
                    <td className="text-center">{(p.bowling?.overs ?? 0).toFixed?.(1) || p.bowling?.overs || 0}-{p.bowling?.runsConceded ?? 0}-{p.bowling?.wickets ?? 0}</td>
                    <td className="text-center">{p.fielding?.catches ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

