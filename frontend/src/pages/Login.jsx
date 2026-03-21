import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

function getApiErrorMessage(err, fallback = 'Login failed') {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map(e => e?.msg).filter(Boolean).join(', ') || fallback;
  }
  return fallback;
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      toast.error('Username and password are required');
      return;
    }
    if (cleanUsername.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    setLoading(true);
    try {
      await login(cleanUsername, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900 px-4">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-amber-400 mb-2">🏏 Night Cricket</h1>
        <p className="text-gray-400 text-sm mb-6">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Username</label>
            <input type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username" />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" />
          </div>
          <button type="submit" className="w-full btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-400">
          Don't have an account? <Link to="/signup" className="text-amber-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
