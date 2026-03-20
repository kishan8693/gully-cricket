import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function getApiErrorMessage(err, fallback = 'Signup failed') {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map(e => e?.msg).filter(Boolean).join(', ') || fallback;
  }
  return fallback;
}

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error('Username at least 3 characters');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(cleanUsername, password, 'user');
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900 px-4">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-amber-400 mb-2">🏏 Night Cricket</h1>
        <p className="text-gray-400 text-sm mb-6">Create your account (read-only user)</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Username</label>
            <input type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username" />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" />
          </div>
          <button type="submit" className="w-full btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-400">
          Already have an account? <Link to="/login" className="text-amber-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
