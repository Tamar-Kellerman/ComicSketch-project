import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5286';

const TYPE_LABELS = { author: 'Writer', artist: 'Artist', admin: 'Admin' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${API}/api/users`)
      .then(r => r.json())
      .then(data => { setUsers(data); setLoading(false); })
      .catch(() => { setError('Error loading users'); setLoading(false); });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"?`)) return;
    const res = await fetch(`${API}/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.userId !== userId));
    } else {
      alert('Error deleting user');
    }
  };

  const filtered = users.filter(u => {
    if (filter === 'author') return u.userType === 'author';
    if (filter === 'artist') return u.userType === 'artist';
    return true;
  });

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>User Management</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[['all', 'All'], ['author', 'Writers only'], ['artist', 'Artists only']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={filter === val ? 'btn-purple' : 'btn-outline'}
            style={{ padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: filter === val ? 'bold' : 'normal' }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'right' }}>
              <th style={th}>Full Name</th>
              <th style={th}>Username</th>
              <th style={th}>Email</th>
              <th style={th}>Phone</th>
              <th style={th}>Type</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.userId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={td}>{u.fullName}</td>
                <td style={td}>{u.userName}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.phoneNumber || '—'}</td>
                <td style={td}>
                  <span style={{ ...badge, background: badgeColor(u.userType) }}>
                    {TYPE_LABELS[u.userType] || u.userType}
                  </span>
                </td>
                <td style={td}>
                  <button
                    onClick={() => handleDelete(u.userId, u.userName)}
                    style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && filtered.length === 0 && <p style={{ color: '#6B7280', marginTop: '20px' }}>No users found.</p>}
    </div>
  );
}

const th = { padding: '10px 14px', fontWeight: '600', borderBottom: '2px solid #d1d5db' };
const td = { padding: '10px 14px', verticalAlign: 'middle' };
const badge = { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', color: '#fff', fontWeight: '600' };
const badgeColor = (type) => type === 'author' ? '#7C3AED' : type === 'artist' ? '#0891B2' : '#374151';
