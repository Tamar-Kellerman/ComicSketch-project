import React from 'react';

export default function ArtistMessages() {
  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #06B6D4', paddingBottom: '10px', color: '#2E3A8A' }}>
        Messages & Tender Updates
      </h3>

      <div className="profile-form-container">
        <div style={messageCard}>
          <div style={messageIcon}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={messageTitle}>System Message</div>
            <div style={messageBody}>
              The tender for project <strong>"Young Guardians"</strong> has been closed successfully.
            </div>
            <div style={messageDate}>11/06/2026</div>
          </div>
        </div>

        <p style={{ marginTop: '18px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>
          All system notifications and tender updates will appear here.
        </p>
      </div>
    </div>
  );
}

const messageCard = {
  display: 'flex', alignItems: 'flex-start', gap: '14px',
  padding: '14px 18px',
  background: '#F0F9FF',
  border: '1px solid #BAE6FD',
  borderLeft: '4px solid #06B6D4',
  borderRadius: '10px',
  marginBottom: '10px',
};

const messageIcon = {
  fontSize: '22px', lineHeight: 1, paddingTop: '2px',
};

const messageTitle = {
  fontWeight: '700', fontSize: '13px', color: '#0E7490', marginBottom: '4px',
};

const messageBody = {
  fontSize: '14px', color: '#374151', lineHeight: '1.5',
};

const messageDate = {
  fontSize: '11px', color: '#9CA3AF', marginTop: '6px',
};
