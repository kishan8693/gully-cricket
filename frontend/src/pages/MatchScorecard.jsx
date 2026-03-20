import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MatchScorecard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('batting'); // batting | bowling | commentary
  const [lang, setLang] = useState('en'); // en | hi | gu
  const [commentary, setCommentary] = useState([]);

  useEffect(() => {
    api.get(`/matches/${id}`).then(res => setData(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api.get(`/matches/${id}/commentary?lang=${lang}`)
      .then(res => setCommentary(res.data.data || []))
      .catch(() => {});
  }, [id, lang]);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  if (!data) return <div className="text-gray-400">Match not found</div>;

  const { matchInfo, teamA, teamB, runRate } = data;
  const winnerId = matchInfo?.winner?._id || matchInfo?.winner;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/matches')}>← Matches</button>
        {matchInfo?.status === 'live' && (
          <button className="btn btn-success btn-sm" onClick={() => navigate(`/matches/${id}/live`)}>Live Score</button>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2 text-sm text-gray-400 mb-4">
          <span className={`badge ${matchInfo?.status === 'live' ? 'badge-red' : matchInfo?.status === 'completed' ? 'badge-green' : 'badge-muted'}`}>
            {matchInfo?.status === 'live' ? '● LIVE' : matchInfo?.status}
          </span>
          <span>📅 {formatDate(matchInfo?.date)}</span>
          <span>📍 {matchInfo?.venue}</span>
          <span>{matchInfo?.totalOvers} overs</span>
        </div>
        {matchInfo?.tossWinner && (
          <p className="text-gray-300 text-sm mb-4">
            🪙 {matchInfo.tossWinner?.name || matchInfo.tossWinner?.shortName} won the toss and chose to {matchInfo.decision === 'bat' ? 'bat' : 'field'} first
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className={`flex-1 min-w-[140px] text-center p-4 rounded-lg ${winnerId && teamA?.info?._id === winnerId ? 'ring-2 ring-amber-500' : ''}`}>
            <div className="font-bold text-gray-100">{teamA?.info?.name}</div>
            <div className="text-2xl font-bold text-amber-400">{teamA?.score?.runs}<small className="text-gray-400">/{teamA?.score?.wickets}</small></div>
            <div className="text-sm text-gray-400">({teamA?.score?.overs} ov)</div>
          </div>
          <div className="text-gray-500 font-bold">VS</div>
          <div className={`flex-1 min-w-[140px] text-center p-4 rounded-lg ${winnerId && teamB?.info?._id === winnerId ? 'ring-2 ring-amber-500' : ''}`}>
            <div className="font-bold text-gray-100">{teamB?.info?.name}</div>
            <div className="text-2xl font-bold text-amber-400">{teamB?.score?.runs}<small className="text-gray-400">/{teamB?.score?.wickets}</small></div>
            <div className="text-sm text-gray-400">({teamB?.score?.overs} ov)</div>
          </div>
        </div>
        {matchInfo?.result && (
          <div className="mt-4 text-center text-emerald-400 font-medium w-full flex justify-center items-center gap-2">
            <span className="match-win-firecracker">🎆</span>
            <span className="match-win-rocket">🚀</span>
            <span>🏆 {matchInfo.result}</span>
          </div>
        )}
        <div className="flex gap-4 mt-4 justify-center text-sm">
          <span>CRR: <strong className="text-cyan-400">{runRate?.current?.toFixed(2) ?? '0.00'}</strong></span>
          {runRate?.required != null && <span>RRR: <strong className="text-amber-400">{runRate.required === Infinity ? '∞' : runRate.required?.toFixed(2)}</strong></span>}
        </div>
      </div>

        <div className="flex gap-2 flex-wrap items-center">
        <button className={`btn btn-sm ${tab === 'batting' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('batting')}>
          Batting
        </button>
        <button className={`btn btn-sm ${tab === 'bowling' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('bowling')}>
          Bowling
        </button>
        <button className={`btn btn-sm ${tab === 'commentary' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('commentary')}>
          Commentary
        </button>
        <div className="flex-1" />
        <select className="form-input w-full sm:w-52" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="gu">Gujarati</option>
        </select>
      </div>

      <div className={`card ${tab === 'batting' ? '' : 'hidden'}`}>
        <h3 className="text-lg font-semibold mb-3">Batting - {teamA?.info?.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-700"><th>Batter</th><th className="text-center">R</th><th className="text-center">B</th><th className="text-center">4s</th><th className="text-center">6s</th><th className="text-center">SR</th></tr></thead>
            <tbody>
              {(teamA?.batting || []).map((b, i) => (
                <tr key={b._id || i} className="border-b border-gray-700/50">
                  <td className="py-2"><span className="font-medium">{b.playerId?.name}</span> <span className="text-gray-500 text-xs">{b.dismissal}</span></td>
                  <td className="text-center">{b.runs}</td>
                  <td className="text-center">{b.balls}</td>
                  <td className="text-center">{b.fours}</td>
                  <td className="text-center">{b.sixes}</td>
                  <td className="text-center">{b.strikeRate?.toFixed(1) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={`card ${tab === 'bowling' ? '' : 'hidden'}`}>
        <h3 className="text-lg font-semibold mb-3">Bowling - {teamB?.info?.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-700"><th>Bowler</th><th className="text-center">O</th><th className="text-center">R</th><th className="text-center">W</th><th className="text-center">Econ</th></tr></thead>
            <tbody>
              {(teamB?.bowling || []).map((b, i) => (
                <tr key={b._id || i} className="border-b border-gray-700/50">
                  <td className="py-2 font-medium">{b.bowlerId?.name}</td>
                  <td className="text-center">{b.overs}</td>
                  <td className="text-center">{b.runsGiven}</td>
                  <td className="text-center">{b.wickets}</td>
                  <td className="text-center">{b.economy?.toFixed(1) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={`card ${tab === 'batting' ? '' : 'hidden'}`}>
        <h3 className="text-lg font-semibold mb-3">Batting - {teamB?.info?.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-700"><th>Batter</th><th className="text-center">R</th><th className="text-center">B</th><th className="text-center">4s</th><th className="text-center">6s</th><th className="text-center">SR</th></tr></thead>
            <tbody>
              {(teamB?.batting || []).map((b, i) => (
                <tr key={b._id || i} className="border-b border-gray-700/50">
                  <td className="py-2"><span className="font-medium">{b.playerId?.name}</span> <span className="text-gray-500 text-xs">{b.dismissal}</span></td>
                  <td className="text-center">{b.runs}</td>
                  <td className="text-center">{b.balls}</td>
                  <td className="text-center">{b.fours}</td>
                  <td className="text-center">{b.sixes}</td>
                  <td className="text-center">{b.strikeRate?.toFixed(1) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={`card ${tab === 'bowling' ? '' : 'hidden'}`}>
        <h3 className="text-lg font-semibold mb-3">Bowling - {teamA?.info?.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead><tr className="text-left text-gray-400 border-b border-gray-700"><th>Bowler</th><th className="text-center">O</th><th className="text-center">R</th><th className="text-center">W</th><th className="text-center">Econ</th></tr></thead>
            <tbody>
              {(teamA?.bowling || []).map((b, i) => (
                <tr key={b._id || i} className="border-b border-gray-700/50">
                  <td className="py-2 font-medium">{b.bowlerId?.name}</td>
                  <td className="text-center">{b.overs}</td>
                  <td className="text-center">{b.runsGiven}</td>
                  <td className="text-center">{b.wickets}</td>
                  <td className="text-center">{b.economy?.toFixed(1) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`card ${tab === 'commentary' ? '' : 'hidden'}`}>
        <h3 className="text-lg font-semibold mb-4">💬 Match Commentary</h3>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {commentary.length === 0 ? (
            <p className="text-gray-500 text-sm">No commentary yet</p>
          ) : (
            commentary.map(c => {
              const translated = c.displayDescription || c.description;
              return (
                <div key={c._id} className="flex gap-2 text-sm py-2 border-b border-gray-700/50 last:border-0">
                  <span className="text-amber-400 font-mono shrink-0">{c.over}.{c.ball}</span>
                  <span className="text-gray-300">{translated}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
