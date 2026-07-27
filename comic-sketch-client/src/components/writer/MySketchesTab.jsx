import React, { useState, useEffect } from 'react';
import { validators } from '../../utils/validation';
import SketchModal from './SketchModal';

const API = 'http://localhost:5286';

export default function MySketchesTab({ writerId, writerName, onEditTender }) {
  const [sketches, setSketches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishingId, setPublishingId] = useState(null);
  const [openSketchId, setOpenSketchId] = useState(null);
  const [tenderForm, setTenderForm] = useState({ startDate: today(), endDate: '', details: '' });
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState('');

  function today() { return new Date().toISOString().split('T')[0]; }

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/sketches?userId=${writerId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setSketches(data); setLoading(false); })
      .catch(() => { setError('Failed to load sketches.'); setLoading(false); });
  };

  useEffect(() => { load(); }, [writerId]);

  const handleDelete = async (sketchId) => {
    if (!window.confirm(`Are you sure you want to delete Sketch #${sketchId}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/api/sketches/${sketchId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert('Failed to delete sketch. Please try again.');
    }
  };

  const openPublish = (sketchId) => {
    setPublishingId(sketchId);
    setTenderForm({ startDate: today(), endDate: '', details: '' });
    setFormError('');
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const endErr = validators.endDate(tenderForm.endDate);
    if (endErr) { setFormError(endErr); return; }
    setPublishing(true);
    setFormError('');
    try {
      const res = await fetch(`${API}/api/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: writerId,
          sketchId: publishingId,
          startDate: tenderForm.startDate,
          endDate: tenderForm.endDate,
          additionalDetails: tenderForm.details || null,
        }),
      });
      if (!res.ok) throw new Error();
      const tender = await res.json();
      alert(`Tender #${tender.tenderId} published successfully!`);
      setPublishingId(null);
      load();
    } catch {
      setFormError('Failed to publish tender. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const storyPreview = (text) =>
    text && text.length > 100 ? text.substring(0, 100) + '…' : (text || '—');

  const parseCount = (json) => {
    try { return JSON.parse(json)?.length ?? 0; } catch { return 0; }
  };

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #06B6D4', paddingBottom: '10px', color: '#2E3A8A' }}>
        My Sketches
      </h3>

      {loading && <p style={{ color: '#6B7280' }}>Loading...</p>}
      {error && <p style={{ color: '#EF4444' }}>{error}</p>}
      {!loading && !error && sketches.length === 0 && (
        <p style={{ color: '#6B7280' }}>No sketches saved yet. Go to "Upload New Story" to create one.</p>
      )}

      {openSketchId && (
        <SketchModal sketchId={openSketchId} onClose={() => setOpenSketchId(null)} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        {sketches.map(s => (
          <div key={s.sketchId} style={s.tender ? cardPublished : cardDraft}>

            {/* Colored top bar */}
            <div style={{ ...cardBar, background: s.tender ? '#06B6D4' : '#9333EA' }} />

            <div style={{ padding: '18px 20px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={sketchBadge}>#{s.sketchId}</span>
                  <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Sketch</span>
                  <button style={deleteBtn} onClick={() => handleDelete(s.sketchId)} title="Delete sketch">✕</button>
                </div>
                {s.tender
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={publishedBadge}>{s.tender.status === 'open' ? 'Open Tender' : 'Closed Tender'}</span>
                      <span style={editLink} onClick={() => onEditTender(s.tender.tenderId)}>Edit</span>
                    </div>
                  : <span style={draftBadge}>Draft</span>
                }
              </div>

              {/* Story preview */}
              <p style={{ margin: '0 0 14px', fontSize: '14px', color: '#374151', lineHeight: 1.6, borderLeft: '3px solid #E5E7EB', paddingLeft: '12px' }}>
                {storyPreview(s.originalStory)}
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px', background: '#F8FAFF', borderRadius: '8px', padding: '8px 14px' }}>
                <div style={statBox}>
                  <span style={statNum}>{parseCount(s.charactersJson)}</span>
                  <span style={statLabel}>Characters</span>
                </div>
                <div style={statDivider} />
                <div style={statBox}>
                  <span style={statNum}>{parseCount(s.scenesJson)}</span>
                  <span style={statLabel}>Scenes</span>
                </div>
              </div>

              {/* View Full Sketch */}
              <button style={viewSketchBtn} onClick={() => setOpenSketchId(s.sketchId)}>View Full Sketch</button>

              {/* Publish form or button (drafts only) */}
              {!s.tender && (
                publishingId === s.sketchId ? (
                  <TenderForm
                    title={`Publish Sketch #${s.sketchId} as Tender`}
                    form={tenderForm} setForm={setTenderForm}
                    onSubmit={handlePublish} onCancel={() => setPublishingId(null)}
                    saving={publishing} saveLabel="Publish Tender" error={formError}
                  />
                ) : (
                  <button className="btn-cyan" style={{ display: 'block', width: '100%', marginTop: '8px' }} onClick={() => openPublish(s.sketchId)}>Publish to Tender</button>
                )
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardBase = {
  background: '#fff', borderRadius: '14px', overflow: 'hidden',
  boxShadow: '0 4px 14px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB',
};
const cardPublished = { ...cardBase, borderColor: '#A5F3FC' };
const cardDraft = { ...cardBase, borderColor: '#E9D5FF' };
const cardBar = { height: '5px', width: '100%' };
const sketchBadge = {
  display: 'inline-block', padding: '4px 12px',
  background: '#2E3A8A', color: '#fff',
  borderRadius: '20px', fontSize: '13px', fontWeight: '700',
};
const publishedBadge = {
  display: 'inline-block', padding: '4px 12px',
  background: '#ECFDF5', color: '#059669',
  border: '1px solid #6EE7B7',
  borderRadius: '20px', fontSize: '12px', fontWeight: '600',
};
const draftBadge = {
  display: 'inline-block', padding: '4px 12px',
  background: '#FAF5FF', color: '#7C3AED',
  border: '1px solid #DDD6FE',
  borderRadius: '20px', fontSize: '12px', fontWeight: '600',
};
const statBox = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '0 16px',
};
const statNum = { fontSize: '18px', fontWeight: '700', color: '#2E3A8A' };
const statLabel = { fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' };
const statDivider = { width: '1px', height: '32px', background: '#E5E7EB' };
const deleteBtn = {
  background: 'none', border: '1px solid #FCA5A5', borderRadius: '50%',
  color: '#EF4444', cursor: 'pointer', fontSize: '11px', fontWeight: '700',
  width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
};
const editLink = {
  fontSize: '13px', fontWeight: '600', color: '#06B6D4',
  cursor: 'pointer', textDecoration: 'underline',
};
const viewSketchBtn = {
  display: 'block', width: '100%', padding: '10px 0', textAlign: 'center',
  background: '#F5F3FF', color: '#7C3AED',
  border: '1.5px solid #DDD6FE', borderRadius: '9px',
  cursor: 'pointer', fontSize: '14px', fontWeight: '600',
  marginBottom: '8px',
};
const formBox = {
  background: '#F9FAFB', border: '1px dashed #9333EA',
  borderRadius: '10px', padding: '16px', marginTop: '4px',
};
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#374151', marginBottom: '4px',
};
function TenderForm({ title, form, setForm, onSubmit, onCancel, saving, saveLabel, error, borderColor = '#9333EA' }) {
  return (
    <form onSubmit={onSubmit} style={{ ...formBox, borderColor }}>
      <h5 style={{ margin: '0 0 14px', color: '#2E3A8A' }}>{title}</h5>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Writer / Tender Creator</label>
          <input type="text" className="form-input" disabled value="—" />
        </div>
        <div>
          <label style={labelStyle}>Comic Sketch Preview</label>
          <div style={{ padding: '10px 14px', background: '#F3F4F6', border: '2px dashed #9333EA', borderRadius: '8px', fontSize: '13px', color: '#9333EA', fontWeight: '600' }}>
            🖼️ Sketch attached
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Tender Start Date</label>
          <input type="date" className="form-input"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Tender End Date (Deadline)</label>
          <input type="date" className="form-input"
            value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>

      <label style={labelStyle}>Additional Details & Requirements for Artists</label>
      <textarea rows="3" className="form-input"
        placeholder="Add notes, preferred art style, budget, etc..."
        value={form.details}
        onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
        style={{ marginBottom: '10px' }} />

      {error && <p style={{ color: '#EF4444', fontSize: '13px', margin: '0 0 8px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn-purple" style={{ margin: 0, flex: 1 }} disabled={saving}>
          {saving ? 'Saving...' : saveLabel}
        </button>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none', background: '#6B7280', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
