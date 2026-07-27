import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5286';

const FILE_ICONS = { png: '🖼️', jpg: '🖼️', jpeg: '🖼️', pdf: '📄', doc: '📝', docx: '📝' };

export default function MyProposals({ artistId }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/offers?artistId=${artistId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setProposals(data); setLoading(false); })
      .catch(() => { setError('Failed to load proposals.'); setLoading(false); });
  }, [artistId]);

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
        My Proposal History
      </h3>

      {loading && <p style={{ color: '#6B7280' }}>Loading...</p>}
      {error && <p style={{ color: '#EF4444' }}>{error}</p>}
      {!loading && !error && proposals.length === 0 && (
        <p style={{ color: '#6B7280' }}>You have not submitted any proposals yet.</p>
      )}

      <div style={tableWrap}>
        {proposals.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Tender', 'Submission Date', 'Price Quote', 'Description', 'Files'].map(col => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map((p, i) => (
                <tr key={p.offerId} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <td style={tdStyle}>
                    <span style={idBadge}>#{p.tenderId}</span>
                  </td>
                  <td style={{ ...tdStyle, color: '#6B7280', fontSize: '13px' }}>{formatDate(p.submissionDate)}</td>
                  <td style={tdStyle}>
                    {p.priceQuote != null
                      ? <span style={{ fontWeight: '600', color: '#2E3A8A' }}>₪{Number(p.priceQuote).toFixed(2)}</span>
                      : <span style={{ color: '#9CA3AF' }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: '180px', color: '#374151', fontSize: '13px' }}>
                    {p.offerDescription || <span style={{ color: '#9CA3AF' }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {getFiles(p.offerLink).map((file, fi) => (
                        <a key={fi} href={`${API}${file}`} target="_blank" rel="noreferrer" style={downloadLink}>
                          {fileIcon(file)} Download
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {proposals.length > 0 && (
        <p style={{ marginTop: '14px', fontSize: '12px', color: '#CBD5E1', textAlign: 'center' }}>
          All proposals you have submitted to open tenders
        </p>
      )}
    </div>
  );
}

const tableWrap = {
  borderRadius: '12px', overflow: 'hidden',
  border: '1px solid #E2E8F0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  marginTop: '20px',
};
const thStyle = {
  background: '#06B6D4', color: '#fff',
  padding: '12px 16px', textAlign: 'left',
  fontSize: '13px', fontWeight: '600', letterSpacing: '0.4px',
};
const tdStyle = {
  padding: '13px 16px', borderBottom: '1px solid #F1F5F9',
  fontSize: '14px', color: '#374151',
};
const idBadge = {
  display: 'inline-block', padding: '3px 10px',
  borderRadius: '8px', background: '#EFF6FF',
  color: '#2E3A8A', fontSize: '13px', fontWeight: '700',
};
const downloadLink = {
  display: 'inline-block', padding: '4px 10px',
  background: '#7C3AED', color: '#fff', borderRadius: '6px',
  fontSize: '12px', textDecoration: 'none', fontWeight: '600',
};
