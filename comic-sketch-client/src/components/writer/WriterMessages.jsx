import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5286';

const FILE_ICONS = { png: '🖼️', jpg: '🖼️', jpeg: '🖼️', pdf: '📄', doc: '📝', docx: '📝' };

export default function WriterMessages({ writerId }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/offers?writerId=${writerId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setProposals(data); setLoading(false); })
      .catch(() => { setError('Failed to load proposals.'); setLoading(false); });
  }, [writerId]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const getFiles = (offerLink) =>
    offerLink ? offerLink.split(',').map(f => f.trim()).filter(Boolean) : [];

  const fileIcon = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    return FILE_ICONS[ext] || '📎';
  };

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #06B6D4', paddingBottom: '10px', color: '#2E3A8A' }}>
        Artist Inquiries
      </h3>

      {loading && <p style={{ color: '#6B7280' }}>Loading...</p>}
      {error && <p style={{ color: '#EF4444' }}>{error}</p>}
      {!loading && !error && proposals.length === 0 && (
        <p style={{ color: '#6B7280' }}>No proposals received yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {proposals.map(p => (
          <div key={p.offerId} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <span style={artistBadge}>{p.artistName}</span>
                <span style={tenderBadge}>Tender #{p.tenderId}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(p.submissionDate)}</span>
            </div>

            {p.priceQuote != null && (
              <div style={metaRow}>
                <span style={metaLabel}>Price Quote</span>
                <span style={{ fontWeight: '600', color: '#2E3A8A' }}>₪{Number(p.priceQuote).toFixed(2)}</span>
              </div>
            )}

            {p.offerDescription && (
              <div style={metaRow}>
                <span style={metaLabel}>Description</span>
                <span style={{ color: '#374151', fontSize: '14px' }}>{p.offerDescription}</span>
              </div>
            )}

            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {getFiles(p.offerLink).map((file, fi) => (
                <a key={fi} href={`${API}${file}`} target="_blank" rel="noreferrer" style={downloadBtn}>
                  {fileIcon(file)} Download File {getFiles(p.offerLink).length > 1 ? fi + 1 : ''}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const card = {
  background: '#fff', border: '1px solid #E5E7EB',
  borderLeft: '4px solid #06B6D4',
  borderRadius: '10px', padding: '16px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};
const artistBadge = {
  display: 'inline-block', padding: '3px 12px',
  background: '#EDE9FE', color: '#7C3AED',
  borderRadius: '20px', fontSize: '13px', fontWeight: '700',
  marginRight: '8px',
};
const tenderBadge = {
  display: 'inline-block', padding: '3px 10px',
  background: '#EFF6FF', color: '#2E3A8A',
  borderRadius: '20px', fontSize: '12px', fontWeight: '600',
};
const metaRow = {
  display: 'flex', gap: '10px', fontSize: '13px',
  marginBottom: '4px', alignItems: 'flex-start',
};
const metaLabel = {
  fontWeight: '600', color: '#9CA3AF',
  minWidth: '100px', fontSize: '12px',
  textTransform: 'uppercase', letterSpacing: '0.4px',
};
const downloadBtn = {
  display: 'inline-block', padding: '6px 14px',
  background: '#7C3AED', color: '#fff', borderRadius: '8px',
  fontSize: '13px', textDecoration: 'none', fontWeight: '600',
};
