import React from 'react';

export default function SceneCard({ scene, index }) {
  const location = Array.isArray(scene.location)
    ? scene.location.filter(Boolean).join(', ')
    : scene.location || '';
  const time = Array.isArray(scene.time)
    ? scene.time.filter(Boolean).join(', ')
    : scene.time || '';
  const characters = Array.isArray(scene.characters) ? scene.characters : [];

  const badge = location
    ? { text: `Location: ${location}`, bg: '#F0FDF4', color: '#15803D', border: '#86EFAC', icon: '📍' }
    : time
    ? { text: `Time: ${time}`, bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD', icon: '🕐' }
    : { text: 'Opening', bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB', icon: null };

  return (
    <div style={card}>
      {/* Header row */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {badge.icon && <span style={{ fontSize: '13px' }}>{badge.icon}</span>}
          <span style={{ ...badgeStyle, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            {badge.text}
          </span>
        </div>
        <span style={sceneNum}>Scene {index}</span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#F3F4F6', margin: '10px 0' }} />

      {/* Scene text */}
      <p style={sceneText}>{scene.text}</p>

      {/* Characters */}
      {characters.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <span style={charsLabel}>Characters</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '5px' }}>
            {characters.map((ch, i) => (
              <span key={i} style={chip}>{ch}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const card = {
  background: '#fff', border: '1px solid #E5E7EB',
  borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};
const header = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const sceneNum = {
  fontSize: '14px', fontWeight: '700', color: '#374151',
};
const badgeStyle = {
  display: 'inline-block', padding: '3px 10px',
  borderRadius: '20px', fontSize: '12px', fontWeight: '600',
};
const sceneText = {
  margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.65,
};
const charsLabel = {
  fontSize: '12px', fontWeight: '600', color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.4px',
};
const chip = {
  display: 'inline-block', padding: '3px 10px',
  background: '#F9FAFB', border: '1px solid #E5E7EB',
  borderRadius: '20px', fontSize: '13px', color: '#374151',
};
