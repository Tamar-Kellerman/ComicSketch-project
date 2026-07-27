import React, { useState } from 'react';
import PasswordInput from '../PasswordInput';

export default function AdminLogin({ onLoginSuccess, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5286/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: username, passwordHash: password }),
      });

      if (response.ok) {
        const u = await response.json();
        if (u.userType !== 'admin') {
          setError('Incorrect username or password, or no admin privileges');
          return;
        }
        setError('');
        onLoginSuccess({
          userId: u.userId,
          username: u.userName,
          name: u.fullName,
          email: u.email,
          idCard: u.identityCard,
          phone: u.phoneNumber,
          clubId: u.clubId,
          isAdmin: true,
        });
      } else {
        setError('Incorrect username or password, or no admin privileges');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h3>Admin Login</h3>

      {error && (
        <div style={{ color: '#EF4444', textAlign: 'center', marginBottom: '15px', fontWeight: 'bold', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input type="text" className="form-input" placeholder="Admin username" value={username} onChange={e => setUsername(e.target.value)} />

        <label style={{ marginTop: '10px', display: 'block' }}>Password</label>
        <PasswordInput
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button type="submit" className="btn-purple" style={{ marginTop: '15px' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In as Admin'}
        </button>
      </form>

      <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px' }}>
        <button onClick={onBack} style={{ color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Back to regular login
        </button>
      </div>
    </div>
  );
}
