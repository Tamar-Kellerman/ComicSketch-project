import React, { useState } from 'react';
import AdminUsers from './AdminUsers';
import AdminClubs from './AdminClubs';
import AdminTenders from './AdminTenders';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="dash-container">
      <div className="sidebar">
        <div className="user-info-box">
          <div className="role">System Admin</div>
          <div className="name">{user.name}</div>
        </div>
        <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>User Management</button>
        <button className={`tab-button ${activeTab === 'clubs' ? 'active' : ''}`} onClick={() => setActiveTab('clubs')}>Plan Management</button>
        <button className={`tab-button ${activeTab === 'tenders' ? 'active' : ''}`} onClick={() => setActiveTab('tenders')}>Tenders</button>
        <button onClick={onLogout} className="tab-button btn-logout">Sign Out</button>
      </div>

      <div className="content-area">
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'clubs' && <AdminClubs />}
        {activeTab === 'tenders' && <AdminTenders />}
      </div>
    </div>
  );
}
