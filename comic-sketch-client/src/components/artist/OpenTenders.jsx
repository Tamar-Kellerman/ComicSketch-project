import React, { useState, useEffect } from 'react';
import SketchModal from '../writer/SketchModal';

const API = 'http://localhost:5286';
const ALLOWED = ['image/png', 'image/jpeg', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXT = '.png, .jpg, .jpeg, .pdf, .doc, .docx';

export default function OpenTenders({ artistId }) {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadFor, setUploadFor] = useState(null);
  const [form, setForm] = useState({ files: [], description: '', price: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [openSketchId, setOpenSketchId] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/tenders?status=open`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setTenders(data); setLoading(false); })
      .catch(() => { setError('Failed to load tenders. Please try again later.'); setLoading(false); });
  }, []);

  const openUpload = (tender) => {
    setUploadFor(tender);
    setForm({ files: [], description: '', price: '' });
    setUploadError('');
  };

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files);
    e.target.value = '';
    const invalid = picked.find(f => !ALLOWED.includes(f.type));
    if (invalid) { setUploadError(`File type not allowed. Please upload: ${ALLOWED_EXT}`); return; }
    setForm(f => {
      const merged = [...f.files, ...picked];
      if (merged.length > 5) { setUploadError('You can upload a maximum of 5 files.'); return f; }
      setUploadError('');
      return { ...f, files: merged };
    });
  };

  const removeFile = (index) => setForm(f => ({ ...f, files: f.files.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.files.length === 0) { setUploadError('Please select at least one file.'); return; }
    setUploading(true);
    setUploadError('');
    const data = new FormData();
    data.append('tenderId', uploadFor.tenderId);
    data.append('artistId', artistId);
    form.files.forEach(f => data.append('files', f));
    if (form.description) data.append('offerDescription', form.description);
    if (form.price) data.append('priceQuote', form.price);
    try {
      const res = await fetch(`${API}/api/offers`, { method: 'POST', body: data });
      if (!res.ok) { const msg = await res.text(); throw new Error(msg); }
      alert(`Proposal submitted successfully! (${form.files.length} file${form.files.length > 1 ? 's' : ''})`);
      setUploadFor(null);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #06B6D4', paddingBottom: '10px', color: '#2E3A8A' }}>
        Open Tenders
      </h3>

      {loading && <p style={{ color: '#6B7280' }}>Loading...</p>}
      {error && <p style={{ color: '#EF4444' }}>{error}</p>}
      {!loading && !error && tenders.length === 0 && (
        <p style={{ color: '#6B7280' }}>No open tenders at the moment.</p>
      )}

      {/* Cards grid */}
      <div style={grid}>
        {tenders.map(tender => (
          <div key={tender.tenderId} style={card}>
            {/* Title */}
            <div style={cardTitle}>
              {tender.additionalDetails || `Tender #${tender.tenderId}`}
            </div>

            {/* Meta rows */}
            <div style={metaRow}>
              <GlobeIcon />
              <span style={metaLabel}>Publisher:</span>
              <span style={metaValue}>{tender.writerName || '—'}</span>
            </div>
            <div style={metaDivider} />

            <div style={metaRow}>
              <CalendarIcon />
              <span style={metaLabel}>Deadline:</span>
              <span style={metaValue}>{formatDate(tender.endDate)}</span>
            </div>
            <div style={metaDivider} />

            <div style={metaRow}>
              <TagIcon />
              <span style={metaLabel}>Cost:</span>
              <span style={metaValue}>Free</span>
            </div>

            {/* Action buttons */}
            <div style={cardActions}>
              {tender.sketchId && (
                <button style={sketchBtn} onClick={() => setOpenSketchId(tender.sketchId)}>
                  View Sketch
                  <ArrowIcon color="#9333EA" />
                </button>
              )}
              <button style={proposalBtn} onClick={() => openUpload(tender)}>
                Submit Proposal
                <ArrowIcon color="#06B6D4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sketch modal */}
      {openSketchId && (
        <SketchModal sketchId={openSketchId} onClose={() => setOpenSketchId(null)} />
      )}

      {/* Proposal modal overlay */}
      {uploadFor && (
        <div style={overlay} onClick={() => setUploadFor(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h4 style={{ margin: 0, color: '#2E3A8A' }}>
                Submit Proposal — Tender #{uploadFor.tenderId}
              </h4>
              <button onClick={() => setUploadFor(null)} style={closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Upload Files (up to 5)</label>
              {form.files.length < 5 && (
                <label style={addFileBtn}>
                  <input type="file" accept={ALLOWED_EXT} multiple onChange={handleFileChange} style={{ display: 'none' }} />
                  <UploadIcon />
                  <span>Choose Files</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.85 }}>{form.files.length}/5</span>
                </label>
              )}
              {form.files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {form.files.map((file, i) => (
                    <div key={i} style={fileChip}>
                      <FileIcon />
                      <span style={{ flex: 1, fontSize: '13px', color: '#0E7490', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      <span style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>{(file.size / 1024).toFixed(1)} KB</span>
                      <button type="button" onClick={() => removeFile(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <label style={labelStyle}>Price Quote (optional)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 250.00"
                className="form-input" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                style={{ marginBottom: '10px' }} />

              <label style={labelStyle}>Description (optional)</label>
              <textarea rows="3" className="form-input" placeholder="Describe your proposal..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ marginBottom: '10px' }} />

              {uploadError && <p style={{ color: '#EF4444', fontSize: '13px', margin: '0 0 8px' }}>{uploadError}</p>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-purple" style={{ flex: 1, margin: 0 }} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Submit Proposal'}
                </button>
                <button type="button" onClick={() => setUploadFor(null)}
                  style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none', background: '#6B7280', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SVG icons ── */
const GlobeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const TagIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const ArrowIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const UploadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
  </svg>
);

/* ── Styles ── */
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '16px',
  marginTop: '20px',
};

const card = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  padding: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  transition: 'box-shadow 0.2s',
};

const cardTitle = {
  fontWeight: '700',
  fontSize: '15px',
  color: '#1E293B',
  marginBottom: '14px',
  lineHeight: '1.4',
};

const metaRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 0',
};

const metaLabel = {
  fontSize: '13px',
  color: '#6B7280',
  fontWeight: '500',
};

const metaValue = {
  fontSize: '13px',
  color: '#374151',
  fontWeight: '600',
};

const metaDivider = {
  height: '1px',
  background: '#F1F5F9',
};

const cardActions = {
  marginTop: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sketchBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', padding: '11px 16px',
  background: '#fff', border: '1.5px solid #9333EA',
  borderRadius: '8px', cursor: 'pointer',
  fontSize: '14px', fontWeight: '600', color: '#9333EA',
};

const proposalBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', padding: '11px 16px',
  background: '#fff', border: '1.5px solid #06B6D4',
  borderRadius: '8px', cursor: 'pointer',
  fontSize: '14px', fontWeight: '600', color: '#06B6D4',
};

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};

const modal = {
  background: '#fff',
  borderRadius: '14px',
  padding: '28px',
  width: '100%',
  maxWidth: '480px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '20px',
  borderBottom: '2px solid #06B6D4',
  paddingBottom: '12px',
};

const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '18px', color: '#9CA3AF',
};

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' };

const addFileBtn = {
  display: 'flex', alignItems: 'center', gap: '8px',
  width: '100%', padding: '8px 14px', marginBottom: '8px',
  background: '#06B6D4', border: 'none', borderRadius: '8px',
  color: '#fff', fontSize: '13px', fontWeight: '600',
  cursor: 'pointer', boxSizing: 'border-box',
};

const fileChip = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '5px 10px',
  border: '1.5px dashed #06B6D4', borderRadius: '7px',
  background: '#ECFEFF', boxSizing: 'border-box',
};
