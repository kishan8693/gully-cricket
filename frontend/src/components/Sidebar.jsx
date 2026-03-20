import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/teams', label: 'Teams', icon: '🏆' },
  { to: '/players', label: 'Players', icon: '👤' },
  { to: '/matches', label: 'Matches', icon: '🎯' },
  { to: '/finance', label: 'Finance', icon: '💰' }
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const base = 'flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition';
  const active = 'bg-amber-500/20 text-amber-400';

  return (
    <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-primary-800 border-r border-gray-700 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-amber-400">🏏 Night Cricket</h1>
      </div>
      <nav className="p-3 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `${base} ${isActive ? active : ''}`}>
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `${base} ${isActive ? active : ''}`}>
          <span>👤</span>
          <span>My Profile</span>
        </NavLink>
        <NavLink to="/my-performance" onClick={onClose} className={({ isActive }) => `${base} ${isActive ? active : ''}`}>
          <span>📈</span>
          <span>My Performance</span>
        </NavLink>
      </nav>
      <div className="absolute bottom-4 left-4 right-4 btn-danger border-t border-gray-700 rounded rounded-5">
        <button onClick={handleLogout} className="w-full btn btn-ghost text-center">
          Logout
        </button>
      </div>
    </aside>
  );
}
