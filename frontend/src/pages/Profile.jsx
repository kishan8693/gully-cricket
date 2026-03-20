import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateUserFromProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (username.trim()) formData.append('username', username.trim());
    if (password.length >= 6) formData.append('password', password);
    if (profileImage) formData.append('profileImage', profileImage);
    if (formData.entries().next().done) {
      toast.error('Change something to update');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUser = res.data.user;
      updateUserFromProfile(newUser);
      if (res.data.reLogin) {
        toast.success('Profile updated. Please log in again with your new password.');
        logout();
        navigate('/login');
      } else {
        toast.success('Profile updated');
      }
      setPassword('');
      setProfileImage(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">My Profile</h2>
      <div className="card flex items-center gap-4">
        {user?.profileImage ? (
          <img src={(user.profileImage.startsWith('http') ? '' : (import.meta.env.DEV ? 'http://localhost:5000' : '')) + user.profileImage} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-xl font-bold text-amber-400">{user?.username?.slice(0, 2).toUpperCase()}</div>
        )}
        <div>
          <div className="font-semibold text-gray-100">{user?.username}</div>
          <span className={`badge ${user?.role === 'admin' ? 'badge-gold' : 'badge-muted'}`}>{user?.role}</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h3 className="font-semibold text-gray-200">Edit profile</h3>
        <div>
          <label className="form-label">Username</label>
          <input type="text" className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" minLength={3} />
        </div>
        <div>
          <label className="form-label">New password (leave blank to keep)</label>
          <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} />
          <p className="text-xs text-gray-500 mt-1">If you change password, you will need to log in again.</p>
        </div>
        <div>
          <label className="form-label">Profile image</label>
          <input
            type="file"
            accept="image/*"
            className="form-input"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setProfileImage(file);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(file ? URL.createObjectURL(file) : '');
            }}
          />
          {previewUrl && (
            <div className="mt-3">
              <div className="text-xs text-gray-400 mb-1">Preview</div>
              <img src={previewUrl} alt="new profile preview" className="w-20 h-20 rounded-full object-cover border border-gray-600" />
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
      </form>
    </div>
  );
}
