import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  if (!data) return <div className="text-gray-400">Failed to load dashboard</div>;

  const { summary, standings, recentMatches, upcomingMatches, topBatsmen, financialSummary } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-1">Dashboard</h2>
        <p className="text-gray-400 text-sm">Tournament overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-2xl font-bold text-amber-400">{summary?.totalTeams ?? 0}</div>
          <div className="text-sm text-gray-400">Teams</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-cyan-400">{summary?.totalPlayers ?? 0}</div>
          <div className="text-sm text-gray-400">Players</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-emerald-400">{summary?.completedMatches ?? 0}</div>
          <div className="text-sm text-gray-400">Matches Played</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-gray-200">₹{financialSummary?.totalCollection ?? 0}</div>
          <div className="text-sm text-gray-400">Collection</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Team Standings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2">Team</th>
                <th className="pb-2 text-center">P</th>
                <th className="pb-2 text-center">W</th>
                <th className="pb-2 text-center">L</th>
                <th className="pb-2 text-center">Runs</th>
                <th className="pb-2 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {(standings || []).map((s, i) => (
                <tr key={s.team?._id || i} className="border-b border-gray-700/50">
                  <td className="py-2 font-medium">{s.team?.shortName} - {s.team?.name}</td>
                  <td className="py-2 text-center">{s.matchesPlayed}</td>
                  <td className="py-2 text-center text-emerald-400">{s.won}</td>
                  <td className="py-2 text-center text-red-400">{s.lost}</td>
                  <td className="py-2 text-center">{s.totalRuns}</td>
                  <td className="py-2 text-center font-semibold">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Recent Results</h3>
          {(recentMatches || []).length === 0 ? <p className="text-gray-500 text-sm">No completed matches yet</p> : (
            <ul className="space-y-2">
              {recentMatches.map(m => (
                <li key={m._id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{m.teamA?.shortName} vs {m.teamB?.shortName}</span>
                  <Link to={`/matches/${m._id}`} className="text-amber-400 hover:underline">Scorecard</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Upcoming</h3>
          {(upcomingMatches || []).length === 0 ? <p className="text-gray-500 text-sm">No upcoming matches</p> : (
            <ul className="space-y-2">
              {upcomingMatches.map(m => (
                <li key={m._id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{m.teamA?.shortName} vs {m.teamB?.shortName} - {formatDate(m.date)}</span>
                  <Link to={`/matches/${m._id}`} className="text-amber-400 hover:underline">View</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Top Run Scorers</h3>
        {(topBatsmen || []).length === 0 ? <p className="text-gray-500 text-sm">No stats yet</p> : (
          <ul className="space-y-2">
            {topBatsmen.map((p, i) => (
              <li key={p._id} className="flex items-center justify-between">
                <span className="text-gray-300"><span className="text-amber-400 font-medium">#{i + 1}</span> {p.name} ({p.teamId?.shortName})</span>
                <span className="text-amber-400 font-mono">{p.totalRuns} runs</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-emerald-400">₹{financialSummary?.totalCollection ?? 0}</div>
            <div className="text-xs text-gray-400">Total Collection</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">₹{financialSummary?.totalExpenses ?? 0}</div>
            <div className="text-xs text-gray-400">Total Expenses</div>
          </div>
          <div>
            <div className={`text-xl font-bold ${(financialSummary?.remainingBalance ?? 0) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              ₹{financialSummary?.remainingBalance ?? 0}
            </div>
            <div className="text-xs text-gray-400">Remaining</div>
          </div>
        </div>
      </div>
    </div>
  );
}
