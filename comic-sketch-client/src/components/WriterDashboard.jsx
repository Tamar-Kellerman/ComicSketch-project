import React, { useState } from 'react';
import WriterProfile from './writer/WriterProfile';
import NewSketchTab from './writer/NewSketchTab';
import MyTendersTab from './writer/MyTendersTab';
import WriterMessages from './writer/WriterMessages';
import MySketchesTab from './writer/MySketchesTab';

export default function WriterDashboard({ user, onLogout, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedTenderId, setSelectedTenderId] = useState(null);

  const goToTender = (tenderId) => {
    setSelectedTenderId(tenderId);
    setActiveTab('my_tenders');
  };

  return (
    <div className="dash-container">
      <div className="sidebar">
        <div className="user-info-box">
          <div className="role">Hello, Writer</div>
          <div className="name">{user.name}</div>
        </div>
        <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Personal Details</button>
        <button className={`tab-button ${activeTab === 'new_sketch' ? 'active' : ''}`} onClick={() => setActiveTab('new_sketch')}>Upload New Story</button>
        <button className={`tab-button ${activeTab === 'my_tenders' ? 'active' : ''}`} onClick={() => setActiveTab('my_tenders')}>My Tenders</button>
        <button className={`tab-button ${activeTab === 'my_sketches' ? 'active' : ''}`} onClick={() => setActiveTab('my_sketches')}>My Sketches</button>
        <button className={`tab-button ${activeTab === 'writer_messages' ? 'active' : ''}`} onClick={() => setActiveTab('writer_messages')}>Artist Inquiries</button>
        <button onClick={onLogout} className="tab-button btn-logout">Sign Out</button>
      </div>

      <div className="content-area">
        {activeTab === 'profile' && (
          <WriterProfile user={user} onUserUpdate={onUserUpdate} />
        )}
        {activeTab === 'new_sketch' && (
          <NewSketchTab
            writerName={user.name}
            writerId={user.userId}
            onTenderPublished={() => setActiveTab('my_tenders')}
          />
        )}
        {activeTab === 'my_tenders' && (
          <MyTendersTab
            userId={user.userId}
            selectedTenderId={selectedTenderId}
            onClearSelected={() => setSelectedTenderId(null)}
          />
        )}
        {activeTab === 'my_sketches' && (
          <MySketchesTab
            writerId={user.userId}
            writerName={user.name}
            onEditTender={(tenderId) => goToTender(tenderId)}
          />
        )}
        {activeTab === 'writer_messages' && (
          <WriterMessages writerId={user.userId} />
        )}
      </div>
    </div>
  );
}
