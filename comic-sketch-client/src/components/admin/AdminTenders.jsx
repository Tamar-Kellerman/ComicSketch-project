import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5286';

export default function AdminTenders() {
  const [tenders, setTenders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTenders = (status) => {
    setLoading(true);
    const url = status && status !== 'all' ? `${API}/api/tenders?status=${status}` : `${API}/api/tenders`;
    fetch(url)
      .then(r => r.json())
      .then(data => { setTenders(data); setLoading(false); })
      .catch(() => { setError('Error loading tenders'); setLoading(false); });
  };

  useEffect(() => { fetchTenders(filter); }, [filter]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Tenders</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[['all', 'All'], ['open', 'Active'], ['close', 'Closed']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
              background: filter === val ? '#7C3AED' : '#f3f4f6',
              color: filter === val ? '#fff' : '#374151',
              border: '1px solid ' + (filter === val ? '#7C3AED' : '#d1d5db'),
              fontWeight: filter === val ? 'bold' : 'normal',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'right' }}>
              <th style={th}>#</th>
              <th style={th}>Writer</th>
              <th style={th}>Start Date</th>
              <th style={th}>End Date</th>
              <th style={th}>Status</th>
              <th style={th}>Additional Details</th>
            </tr>
          </thead>
          <tbody>
            {tenders.map(t => (
              <tr key={t.tenderId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={td}>{t.tenderId}</td>
                <td style={td}>{t.writerName}</td>
                <td style={td}>{formatDate(t.startDate)}</td>
                <td style={td}>{formatDate(t.endDate)}</td>
                <td style={td}>
                  <span style={{ ...statusBadge, background: t.status === 'open' ? '#10B981' : '#6B7280' }}>
                    {t.status === 'open' ? 'Active' : 'Closed'}
                  </span>
                </td>
                <td style={{ ...td, maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.additionalDetails || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tenders.length === 0 && <p style={{ color: '#6B7280', marginTop: '20px' }}>No tenders found.</p>}
    </div>
  );
}

const th = { padding: '10px 14px', fontWeight: '600', borderBottom: '2px solid #d1d5db' };
const td = { padding: '10px 14px', verticalAlign: 'middle' };
const statusBadge = { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', color: '#fff', fontWeight: '600' };
