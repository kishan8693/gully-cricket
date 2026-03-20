import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import TeamsDetail from './pages/TeamsDetail';
import Players from './pages/Players';
import Matches from './pages/Matches';
import LiveScoring from './pages/LiveScoring';
import MatchScorecard from './pages/MatchScorecard';
import PlayerProfile from './pages/PlayerProfile';
import FinanceDashboard from './pages/FinanceDashboard';
import Profile from './pages/Profile';
import MyPerformance from './pages/MyPerformance';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-primary-900"><div className="spinner" /></div>;
  }
  if (isAuthPage) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569' } }}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-primary-900 overflow-x-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 w-full ml-0 lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-primary-800/90 border-b border-gray-700">
          <button className="lg:hidden p-2 rounded-lg hover:bg-white/5" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="text-lg font-semibold text-gray-200 min-w-0 truncate max-w-[60vw]">
            {location.pathname === '/' && 'Dashboard'}
            {location.pathname.startsWith('/teams') && 'Teams'}
            {location.pathname.startsWith('/players') && 'Players'}
            {location.pathname.startsWith('/matches') && 'Matches'}
            {location.pathname.startsWith('/finance') && 'Finance'}
            {location.pathname.startsWith('/profile') && 'My Profile'}
            {location.pathname.startsWith('/my-performance') && 'My Performance'}
          </span>
          <div className="flex items-center">
            {user?.profileImage ? (
              <button
                type="button"
                title="Preview profile picture"
                onClick={() => setShowAvatarPreview(true)}
                className="rounded-full"
              >
                <img
                  src={user.profileImage.startsWith('http') ? user.profileImage : (import.meta.env.DEV ? 'http://localhost:5000' : '') + user.profileImage}
                  alt="profile"
                  className="w-9 h-9 rounded-full object-cover border border-gray-600"
                />
              </button>
            ) : (
              <button
                type="button"
                title="Open profile"
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-full bg-primary-700 border border-gray-600 flex items-center justify-center text-xs font-bold text-amber-400"
              >
                {(user?.username || 'U').slice(0, 2).toUpperCase()}
              </button>
            )}
          </div>
        </header>
        <div className="w-full py-4 px-4 sm:px-6 md:px-8 max-w-full">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
            <Route path="/teams/:id" element={<ProtectedRoute><TeamsDetail /></ProtectedRoute>} />
            <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
            <Route path="/players/:id" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
            <Route path="/matches/:id" element={<ProtectedRoute><MatchScorecard /></ProtectedRoute>} />
            <Route path="/matches/:id/live" element={<ProtectedRoute><LiveScoring /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/my-performance" element={<ProtectedRoute><MyPerformance /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569' } }} />
      {showAvatarPreview && user?.profileImage && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4" onClick={() => setShowAvatarPreview(false)}>
          <div className="relative card max-w-sm w-80" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-2 right-2 btn btn-ghost btn-sm text-red-500 hover:text-red-500"
              onClick={() => setShowAvatarPreview(false)}
            >
              ✕
            </button>
            <img
              src={user.profileImage.startsWith('http') ? user.profileImage : (import.meta.env.DEV ? 'http://localhost:5000' : '') + user.profileImage}
              alt="profile preview"
              className="w-56 h-56 mx-auto rounded-full object-cover border border-gray-600"
            />
            <div className="mt-3 flex justify-end bg-danger">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowAvatarPreview(false); navigate('/profile'); }}>
                Edit profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <AppLayout />;
}
