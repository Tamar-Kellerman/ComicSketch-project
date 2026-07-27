import React, { useState } from 'react';
import { validateFields } from '../../utils/validation';

export default function WriterProfile({ user, onUserUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showClubForm, setShowClubForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    username: user.username || '',
    password: user.password || '',
    name: user.name || '',
    idCard: user.idCard || '',
    phone: user.phone || '',
    email: user.email || '',
    clubId: user.clubId || 1
  });

  const getClubDisplayName = (id) => {
    if (Number(id) === 1) return 'Basic Plan (₪10)';
    if (Number(id) === 2) return 'Pro Plan (₪15)';
    return 'No plan selected';
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const validationErrors = validateFields({
      username: formData.username,
      password: formData.password,
      name: formData.name,
      idCard: formData.idCard,
      phone: formData.phone,
      email: formData.email,
    });
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({});

    const updatedUserDto = {
      userId: user.userId,
      userName: formData.username,
      passwordHash: formData.password,
      fullName: formData.name,
      identityCard: formData.idCard,
      phoneNumber: formData.phone,
      email: formData.email,
      clubId: formData.clubId
    };

    try {
      const response = await fetch(`http://localhost:5286/api/users/${user.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserDto),
      });

      if (response.ok) {
        alert('Details updated and saved successfully!');
        setIsEditing(false);
        setShowClubForm(false);

        const updatedUserForReact = {
          userId: user.userId,
          username: formData.username,
          password: formData.password,
          name: formData.name,
          idCard: formData.idCard,
          phone: formData.phone,
          email: formData.email,
          clubId: formData.clubId,
          isWriter: true
        };

        if (typeof onUserUpdate === 'function') onUserUpdate(updatedUserForReact);
      } else {
        const errorText = await response.text();
        alert(`Update failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Server communication error during update:', error);
      alert('Server communication error.');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username || '', password: user.password || '',
      name: user.name || '', idCard: user.idCard || '',
      phone: user.phone || '', email: user.email || '',
      clubId: user.clubId || 1
    });
    setErrors({});
    setIsEditing(false);
    setShowClubForm(false);
  };

  const ErrorMsg = ({ field }) =>
    errors[field] ? <span style={{ color: '#EF4444', fontSize: '13px', display: 'block', marginTop: '3px' }}>{errors[field]}</span> : null;

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #9333EA', paddingBottom: '10px', color: '#2E3A8A' }}>
        Personal Details
      </h3>

      <form onSubmit={handleSave} className="profile-form-container">
        <div className="profile-grid">
          <div className="profile-field-group">
            <label>Username</label>
            <input type="text" className="form-input" disabled={!isEditing}
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})} />
            <ErrorMsg field="username" />
          </div>

          <div className="profile-field-group">
            <label>Password</label>
            <input type="text" className="form-input" disabled={!isEditing}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <ErrorMsg field="password" />
          </div>

          <div className="profile-field-group">
            <label>Full Name</label>
            <input type="text" className="form-input" disabled={!isEditing}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})} />
            <ErrorMsg field="name" />
          </div>

          <div className="profile-field-group">
            <label>ID Number</label>
            <input type="text" className="form-input" disabled={!isEditing}
              value={formData.idCard}
              onChange={(e) => setFormData({...formData, idCard: e.target.value})} />
            <ErrorMsg field="idCard" />
          </div>

          <div className="profile-field-group">
            <label>Phone Number</label>
            <input type="tel" className="form-input" disabled={!isEditing}
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            <ErrorMsg field="phone" />
          </div>

          <div className="profile-field-group">
            <label>Email Address</label>
            <input type="email" className="form-input" disabled={!isEditing}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <ErrorMsg field="email" />
          </div>

          <div className="profile-field-group" style={{ gridColumn: '1 / -1' }}>
            <label>Current Subscription Plan</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="text" className="form-input" disabled
                value={getClubDisplayName(formData.clubId)}
                style={{ flex: 1, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} />
              {isEditing && !showClubForm && (
                <button type="button" onClick={() => setShowClubForm(true)}
                  className="btn-cyan"
                  style={{ margin: 0, padding: '10px 20px', backgroundColor: '#06B6D4' }}>
                  Change Plan
                </button>
              )}
            </div>
          </div>
        </div>

        {isEditing && showClubForm && (
          <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#F8FAFC', border: '2px dashed #9333EA', borderRadius: '12px' }}>
            <h4 style={{ color: '#2E3A8A', marginTop: 0, marginBottom: '15px', textAlign: 'center' }}>Choose your subscription plan:</h4>

            <div onClick={() => setFormData({...formData, clubId: 1})}
              style={{
                border: formData.clubId === 1 ? '2px solid #9333EA' : '1px solid #CBD5E1',
                backgroundColor: formData.clubId === 1 ? '#FAF5FF' : '#ffffff',
                padding: '15px 20px', borderRadius: '8px', marginBottom: '15px',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', transition: 'all 0.2s ease-in-out'
              }}>
              <div>
                <h3 style={{ margin: 0, color: '#1E293B', fontSize: '18px' }}>Basic Plan</h3>
                <p style={{ margin: '5px 0 0', color: '#64748B', fontSize: '14px' }}>Allows creating 1 sketch per month</p>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#9333EA' }}>₪10</div>
            </div>

            <div onClick={() => setFormData({...formData, clubId: 2})}
              style={{
                border: formData.clubId === 2 ? '2px solid #9333EA' : '1px solid #CBD5E1',
                backgroundColor: formData.clubId === 2 ? '#FAF5FF' : '#ffffff',
                padding: '15px 20px', borderRadius: '8px',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', transition: 'all 0.2s ease-in-out'
              }}>
              <div>
                <h3 style={{ margin: 0, color: '#1E293B', fontSize: '18px' }}>Pro Plan</h3>
                <p style={{ margin: '5px 0 0', color: '#64748B', fontSize: '14px' }}>Allows creating 2 sketches per month</p>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#9333EA' }}>₪15</div>
            </div>
          </div>
        )}

        <div className="profile-actions" style={{ marginTop: '25px' }}>
          {isEditing ? (
            <>
              <button type="button" onClick={handleCancel} className="btn-purple" style={{ backgroundColor: '#9CA3AF' }}>Cancel</button>
              <button type="submit" className="btn-purple">Save Changes</button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className="btn-cyan" style={{ backgroundColor: '#9333EA' }}>Edit Details</button>
          )}
        </div>
      </form>
    </div>
  );
}
