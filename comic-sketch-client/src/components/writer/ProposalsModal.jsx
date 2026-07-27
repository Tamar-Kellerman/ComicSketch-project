import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5286';

export default function ProposalsModal({ tenderId, onClose }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/offers?tenderId=${tenderId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setProposals(data); setLoading(false); })
      .catch(() => { setError('Failed to load proposals.'); setLoading(false); });
  }, [tenderId]);

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-GB') : '—';

  const getFileLabel = (link) => {
    const ext = link.split('.').pop().toLowerCase();
    const icons = { png: '🖼️', jpg: '🖼️', jpeg: '🖼️', pdf: '📄', doc: '📝', docx: '📝' };
    return icons[ext] || '📎';
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#2E3A8A' }}>Proposals for Tender #{tenderId}</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {loading && <p style={{ color: '#6B7280' }}>Loading...</p>}
        {error && <p style={{ color: '#EF4444' }}>{error}</p>}
        {!loading && !error && proposals.length === 0 && (
          <p style={{ color: '#6B7280' }}>No proposals submitted yet.</p>
        )}

        {proposals.map(p => (
          <div key={p.offerId} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#2E3A8A' }}>{p.artistName}</div>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(p.submissionDate)}</span>
            </div>

            {p.priceQuote != null && (
              <div style={{ marginTop: '6px', fontSize: '14px' }}>
                <strong>Price Quote:</strong> ₪{Number(p.priceQuote).toFixed(2)}
              </div>
            )}

            {p.offerDescription && (
              <div style={{ marginTop: '6px', fontSize: '14px', color: '#374151' }}>
                <strong>Description:</strong> {p.offerDescription}
              </div>
            )}

            <a
              href={`${API}${p.offerLink}`}
              target="_blank"
              rel="noreferrer"
              style={downloadBtn}
            >
              {getFileLabel(p.offerLink)} Download File
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '20px',
};
const modal = {
  background: '#fff', borderRadius: '14px', padding: '28px',
  width: '100%', maxWidth: '600px', maxHeight: '85vh',
  overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
const closeBtn = {
  background: '#f3f4f6', border: 'none', borderRadius: '8px',
  padding: '6px 12px', cursor: 'pointer', fontSize: '16px', color: '#374151',
};
const card = {
  background: '#f9fafb', border: '1px solid #e5e7eb',
  borderRadius: '10px', padding: '16px', marginBottom: '12px',
};
const downloadBtn = {
  display: 'inline-block', marginTop: '10px', padding: '7px 14px',
  background: '#7C3AED', color: '#fff', borderRadius: '8px',
  fontSize: '13px', textDecoration: 'none', fontWeight: '600',
};
