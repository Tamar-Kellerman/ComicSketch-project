import React, { useState } from 'react';
import ArtistProfile from './artist/ArtistProfile';
import OpenTenders from './artist/OpenTenders';
import MyProposals from './artist/MyProposals';
import ArtistMessages from './artist/ArtistMessages';

export default function ArtistDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="dash-container">
      <div className="sidebar">
        <div className="user-info-box">
          <div className="name">Hello, {user.name}</div>
          <div className="role">Artist</div>
        </div>
        <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Personal Details</button>
        <button className={`tab-button ${activeTab === 'open_tenders' ? 'active' : ''}`} onClick={() => setActiveTab('open_tenders')}>Open Tenders</button>
        <button className={`tab-button ${activeTab === 'my_proposals' ? 'active' : ''}`} onClick={() => setActiveTab('my_proposals')}>My Proposals</button>
        <button className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>Messages & Updates</button>
        <button onClick={onLogout} className="tab-button btn-logout">Sign Out</button>
      </div>

      <div className="content-area">
        {activeTab === 'profile' && <ArtistProfile user={user} />}
        {activeTab === 'open_tenders' && <OpenTenders artistId={user.userId} />}
        {activeTab === 'my_proposals' && <MyProposals artistId={user.userId} />}
        {activeTab === 'messages' && <ArtistMessages />}
      </div>
    </div>
  );
}
