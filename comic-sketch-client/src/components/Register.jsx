import React, { useState, useEffect } from 'react';
import { validateFields } from '../utils/validation';
import PasswordInput from './PasswordInput';

export default function Register({ onRegisterSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [clubs, setClubs] = useState([]);
  const [errors, setErrors] = useState({});
  const [regData, setRegData] = useState({
    username: '', password: '', name: '', idCard: '', phone: '', email: '',
    isArtist: false, isWriter: false, clubId: null
  });

  useEffect(() => {
    fetch('http://localhost:5286/api/clubs')
      .then(res => res.json())
      .then(data => setClubs(data))
      .catch(err => console.error("Error loading clubs:", err));
  }, []);

  const handleNextStep1 = (e) => {
    e.preventDefault();
    const validationErrors = validateFields({ username: regData.username, password: regData.password });
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({});
    setStep(2);
  };

  const isArtistOnly = regData.isArtist && !regData.isWriter;
  const totalSteps = isArtistOnly ? 2 : 3;

  const handleNextStep2 = (e) => {
    e.preventDefault();
    const validationErrors = validateFields({
      name: regData.name, idCard: regData.idCard,
      phone: regData.phone, email: regData.email
    });
    if (!regData.isArtist && !regData.isWriter) {
      validationErrors.role = 'Please select at least one role (Writer or Artist)';
    }
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({});
    if (regData.isArtist && !regData.isWriter) {
      onRegisterSuccess({ ...regData, clubId: null });
    } else {
      setStep(3);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!regData.clubId) {
      setErrors({ club: 'Please select a subscription plan to complete registration' });
      return;
    }
    setErrors({});
    onRegisterSuccess(regData);
  };

  const ErrorMsg = ({ field }) =>
    errors[field] ? <span style={{ color: '#EF4444', fontSize: '13px', display: 'block', marginBottom: '6px' }}>{errors[field]}</span> : null;

  return (
    <div className="auth-card" style={{ maxWidth: step === 3 ? '500px' : '400px' }}>
      <h3 style={{ marginBottom: '5px' }}>Create New Account</h3>
      <p style={{ textAlign: 'center', color: '#06B6D4', fontWeight: 'bold', margin: '0 0 20px 0' }}>
        Step {step} of {totalSteps}
      </p>

      {step === 1 && (
        <form onSubmit={handleNextStep1}>
          <label>Choose a username</label>
          <input type="text" className="form-input" value={regData.username}
            onChange={(e) => setRegData({...regData, username: e.target.value})}
            placeholder="e.g. TamarK" />
          <ErrorMsg field="username" />

          <label>Choose a strong password</label>
          <PasswordInput
            value={regData.password}
            onChange={(e) => setRegData({...regData, password: e.target.value})}
            placeholder="At least 6 characters"
          />
          <ErrorMsg field="password" />

          <button type="submit" className="btn-purple">Continue to Next Step</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleNextStep2}>
          <label>Full Name</label>
          <input type="text" className="form-input" value={regData.name}
            onChange={(e) => setRegData({...regData, name: e.target.value})}
            placeholder="First and last name" />
          <ErrorMsg field="name" />

          <label>ID Number</label>
          <input type="text" className="form-input" value={regData.idCard}
            onChange={(e) => setRegData({...regData, idCard: e.target.value})}
            placeholder="9 digits" />
          <ErrorMsg field="idCard" />

          <label>Phone Number</label>
          <input type="tel" className="form-input" value={regData.phone}
            onChange={(e) => setRegData({...regData, phone: e.target.value})}
            placeholder="e.g. 0501234567" />
          <ErrorMsg field="phone" />

          <label>Email Address</label>
          <input type="email" className="form-input" value={regData.email}
            onChange={(e) => setRegData({...regData, email: e.target.value})}
            placeholder="name@example.com" />
          <ErrorMsg field="email" />

          <label style={{ fontWeight: 'bold', display: 'block', marginTop: '15px', marginBottom: '10px' }}>Select your role:</label>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={regData.isWriter}
                onChange={(e) => setRegData({...regData, isWriter: e.target.checked})} />
              I'm a Writer
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={regData.isArtist}
                onChange={(e) => setRegData({...regData, isArtist: e.target.checked})} />
              I'm an Artist
            </label>
          </div>
          <ErrorMsg field="role" />

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setStep(1)} className="btn-purple" style={{ backgroundColor: '#9CA3AF' }}>Back</button>
            <button type="submit" className="btn-purple">{isArtistOnly ? 'Finish & Register' : 'Continue to Choose Plan'}</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 'bold', textAlign: 'center', display: 'block', marginBottom: '15px' }}>
            Choose your subscription plan:
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '10px' }}>
            {clubs.map((club) => (
              <div key={club.clubId} onClick={() => setRegData({...regData, clubId: club.clubId})}
                style={{
                  padding: '15px', borderRadius: '10px',
                  border: regData.clubId === club.clubId ? '2px solid #9333EA' : '1px solid #E5E7EB',
                  backgroundColor: regData.clubId === club.clubId ? '#FAF5FF' : 'white',
                  cursor: 'pointer', transition: '0.3s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>{club.clubType} Plan</span>
                  <span style={{ color: '#9333EA' }}>₪{club.costs}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '5px' }}>
                  Allows creating {club.sketchesPerMonth} sketch(es) per month
                </div>
              </div>
            ))}
          </div>
          <ErrorMsg field="club" />

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setStep(2)} className="btn-purple" style={{ backgroundColor: '#9CA3AF' }}>Back</button>
            <button type="submit" className="btn-purple">Finish & Register</button>
          </div>
        </form>
      )}
    </div>
  );
}
