import React, { useState } from 'react';
import { validateFields } from '../../utils/validation';

export default function ArtistProfile({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: user.name,
    idCard: user.idCard,
    phone: user.phone,
    email: user.email
  });

  const handleSave = (e) => {
    e.preventDefault();
    const validationErrors = validateFields({
      name: formData.name,
      idCard: formData.idCard,
      phone: formData.phone,
      email: formData.email,
    });
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({});
    setIsEditing(false);
    alert('Changes saved successfully!');
  };

  const handleCancel = () => {
    setFormData({ name: user.name, idCard: user.idCard, phone: user.phone, email: user.email });
    setErrors({});
    setIsEditing(false);
  };

  const ErrorMsg = ({ field }) =>
    errors[field] ? <span style={{ color: '#EF4444', fontSize: '13px', display: 'block', marginTop: '3px' }}>{errors[field]}</span> : null;

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #06B6D4', paddingBottom: '10px', color: '#2E3A8A' }}>
        Personal Details
      </h3>

      <form onSubmit={handleSave} className="profile-form-container">
        <div className="profile-grid">
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
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button type="button" onClick={handleCancel} className="btn-purple" style={{ backgroundColor: '#9CA3AF' }}>Cancel</button>
              <button type="submit" className="btn-purple">Save Changes</button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className="btn-cyan">Edit Details</button>
          )}
        </div>
      </form>
    </div>
  );
}
