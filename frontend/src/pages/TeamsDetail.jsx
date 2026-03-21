import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function TeamsDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/teams/${id}`)
      .then(res => setTeam(res.data.data))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load team'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="spinner" />
    </div>
  );

  if (!team) return <div className="text-gray-400">Team not found</div>;

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden px-3 sm:px-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:flex-wrap sm:items-stretch">
        <Link to="/teams" className="btn btn-ghost btn-sm w-full sm:w-auto rounded-lg px-4 py-2 text-center shrink-0">← Teams</Link>
        <div className="card flex-1 min-w-0 bg-white/5 backdrop-blur-md border-white/10 shadow-md rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-white text-xs sm:text-sm shadow-md"
              style={{ background: `linear-gradient(135deg, ${team.primaryColor || '#334155'}, ${team.secondaryColor || '#64748b'})` }}
            >
              {team.shortName}
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-gray-100 truncate break-words">{team.name}</div>
              <div className="text-xs sm:text-sm text-gray-400">{team.totalPlayers} players</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rounded-xl shadow-md p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-3 sm:mb-4">Players</h3>
        {team.players?.length === 0 ? (
          <p className="text-gray-500 text-sm">No players yet</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.players.map(p => (
              <div
                key={p._id}
                className="w-full p-4 sm:p-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-md hover:shadow-xl transition duration-300 active:scale-[0.99] sm:hover:scale-[1.01] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 w-full">
                  {p.profileImage ? (
                    <img
                      src={p.profileImage.startsWith('http') ? p.profileImage : (import.meta.env.DEV ? 'http://localhost:5000' : '') + p.profileImage}
                      alt=""
                      className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full object-cover bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold text-sm sm:text-base shadow-md ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold text-sm sm:text-base shadow-md ring-2 ring-white/10">
                      {p.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm sm:text-lg font-bold text-white truncate break-words max-w-full">{p.name}</div>
                      {p.jerseyNumber != null && (
                        <span className="badge badge-muted">#{p.jerseyNumber}</span>
                      )}
                      {(p?.isCaptain === true || p?.captain === true) && (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500 text-black">C</span>
                      )}
                      {(p?.isViceCaptain === true || p?.viceCaptain === true) && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-500 text-white">VC</span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400 break-words">{p.role}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center w-full sm:w-auto sm:min-w-[140px] border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0 shrink-0">
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-400">Runs</div>
                    <div className="text-xs sm:text-sm font-semibold text-yellow-400">{p.totalRuns ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-400">Wickets</div>
                    <div className="text-xs sm:text-sm font-semibold text-blue-400">{p.totalWickets ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-gray-400">SR</div>
                    <div className="text-xs sm:text-sm font-semibold text-white">
                      {p.strikeRate?.toFixed ? p.strikeRate.toFixed(2) : (p.strikeRate ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

