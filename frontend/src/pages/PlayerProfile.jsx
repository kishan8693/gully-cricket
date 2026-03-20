import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/players/${id}`).then(res => setPlayer(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  if (!player) return <div className="text-gray-400">Player not found</div>;

  return (
    <div className="space-y-6">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/players')}>← Players</button>
      <div className="card flex flex-wrap items-center gap-6">
        {player.profileImage ? (
          <img src={player.profileImage.startsWith('http') ? player.profileImage : (import.meta.env.DEV ? 'http://localhost:5000' : '') + player.profileImage} alt="" className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary-700 flex items-center justify-center text-3xl font-bold text-amber-400">{player.name?.slice(0, 2).toUpperCase()}</div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-100">{player.name}</h2>
          <p className="text-gray-400">{player.teamId?.name} · {player.role}</p>
          {player.jerseyNumber && <p className="text-sm text-gray-500">#{player.jerseyNumber}</p>}
        </div>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><div className="text-2xl font-bold text-amber-400">{player.totalRuns ?? 0}</div><div className="text-sm text-gray-400">Total Runs</div></div>
          <div><div className="text-2xl font-bold text-cyan-400">{player.totalFours ?? 0}</div><div className="text-sm text-gray-400">Fours</div></div>
          <div><div className="text-2xl font-bold text-emerald-400">{player.totalSixes ?? 0}</div><div className="text-sm text-gray-400">Sixes</div></div>
          <div><div className="text-2xl font-bold text-gray-200">{player.strikeRate ?? 0}</div><div className="text-sm text-gray-400">Strike Rate</div></div>
        </div>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Match performances</h3>
        {(player.performances || []).length === 0 ? <p className="text-gray-500 text-sm">No matches yet</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
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
                {player.performances.map((p, i) => (
                  <tr key={p.matchId?._id || i} className="border-b border-gray-700/50">
                    <td className="py-2">Match #{p.matchId?.matchNumber ?? '-'}</td>
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
                      {(p.bowling?.overs ?? 0) > 0 ? ((p.bowling?.runsConceded ?? 0) / (p.bowling?.overs ?? 1)).toFixed(2) : '0.00'}
                    </td>
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
