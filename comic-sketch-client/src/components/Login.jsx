import React, { useState } from 'react';
import { validateFields } from '../utils/validation';
import PasswordInput from './PasswordInput';

export default function Login({ onLoginSuccess, onNavigateToRegister, onNavigateToAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateFields({ username, password });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5286/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: username, passwordHash: password }),
      });

      if (response.ok) {
        const u = await response.json();
        setErrors({});
        onLoginSuccess({
          userId: u.userId,
          username: u.userName,
          name: u.fullName,
          email: u.email,
          idCard: u.identityCard,
          phone: u.phoneNumber,
          clubId: u.clubId,
          isWriter: u.userType === 'author' || u.userType === 'writer',
          isArtist: u.userType === 'artist',
          isAdmin: u.userType === 'admin',
        });
      } else {
        setErrors({ general: 'Incorrect username or password!' });
      }
    } catch {
      setErrors({ general: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h3>Sign In</h3>

      {errors.general && (
        <div style={{ color: '#EF4444', textAlign: 'center', marginBottom: '15px', fontWeight: 'bold' }}>
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input
          type="text"
          className="form-input"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {errors.username && <span style={{ color: '#EF4444', fontSize: '13px' }}>{errors.username}</span>}

        <label style={{ marginTop: '10px', display: 'block' }}>Password</label>
        <PasswordInput
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errors.password && <span style={{ color: '#EF4444', fontSize: '13px' }}>{errors.password}</span>}

        <button type="submit" className="btn-purple" style={{ marginTop: '15px' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
        <span>Don't have an account? </span>
        <button onClick={onNavigateToRegister} style={{ color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>
          Create a new account
        </button>
      </div>

      <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '13px' }}>
        <button onClick={onNavigateToAdmin} style={{ color: '#9333EA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Admin login
        </button>
      </div>
    </div>
  );
}
