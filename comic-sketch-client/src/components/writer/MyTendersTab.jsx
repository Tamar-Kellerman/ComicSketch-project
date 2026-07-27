import React, { useState, useEffect } from 'react';
import SketchModal from './SketchModal';
import ProposalsModal from './ProposalsModal';
import { validators } from '../../utils/validation';

const API = 'http://localhost:5286';

export default function MyTendersTab({ userId, selectedTenderId, onClearSelected }) {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(selectedTenderId || null);

  // Sync when parent navigates here with a pre-selected tender
  useEffect(() => {
    if (selectedTenderId) { setDetailId(selectedTenderId); onClearSelected?.(); }
  }, [selectedTenderId]);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/tenders?userId=${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setTenders(data); setLoading(false); })
      .catch(() => { setError('Failed to load tenders.'); setLoading(false); });
  };

  useEffect(() => { load(); }, [userId]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const selectedTender = tenders.find(t => t.tenderId === detailId);

  if (detailId && selectedTender) {
    return (
      <TenderDetail
        tender={selectedTender}
        onBack={() => setDetailId(null)}
        onSaved={load}
      />
    );
  }

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #06B6D4', paddingBottom: '10px', color: '#2E3A8A' }}>
        My Tenders
      </h3>

      {loading && <p style={{ color: '#6B7280' }}>Loading...</p>}
      {error && <p style={{ color: '#EF4444' }}>{error}</p>}
      {!loading && !error && tenders.length === 0 && (
        <p style={{ color: '#6B7280' }}>You have no tenders yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {tenders.map(tender => (
          <div key={tender.tenderId} style={listCard}
            onClick={() => setDetailId(tender.tenderId)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <strong style={{ color: '#2E3A8A' }}>Tender #{tender.tenderId}</strong>
                <span style={{
                  padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                  background: tender.status === 'open' ? '#D1FAE5' : '#F3F4F6',
                  color: tender.status === 'open' ? '#065F46' : '#6B7280',
                }}>
                  {tender.status === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Deadline: {formatDate(tender.endDate)}</span>
                <span style={{ color: '#06B6D4', fontSize: '18px' }}>›</span>
              </div>
            </div>
            {tender.additionalDetails && (
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6B7280' }}>
                {tender.additionalDetails.length > 80
                  ? tender.additionalDetails.substring(0, 80) + '…'
                  : tender.additionalDetails}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tender Detail Page ── */
function TenderDetail({ tender, onBack, onSaved }) {
  const [openSketchId, setOpenSketchId] = useState(null);
  const [openProposals, setOpenProposals] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    startDate: tender.startDate ? new Date(tender.startDate).toISOString().split('T')[0] : '',
    endDate: tender.endDate ? new Date(tender.endDate).toISOString().split('T')[0] : '',
    details: tender.additionalDetails || '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const handleSave = async (e) => {
    e.preventDefault();
    const endErr = validators.endDate(form.endDate);
    if (endErr) { setFormError(endErr); return; }
    setSaving(true); setFormError('');
    try {
      const res = await fetch(`http://localhost:5286/api/tenders/${tender.tenderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: form.startDate,
          endDate: form.endDate,
          additionalDetails: form.details || null,
        }),
      });
      if (!res.ok) throw new Error();
      alert(`Tender #${tender.tenderId} updated successfully!`);
      setEditing(false);
      onSaved();
    } catch {
      setFormError('Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #06B6D4', paddingBottom: '12px' }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
        <h3 style={{ margin: 0, color: '#2E3A8A' }}>Tender #{tender.tenderId}</h3>
        <span style={{
          padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
          background: tender.status === 'open' ? '#D1FAE5' : '#F3F4F6',
          color: tender.status === 'open' ? '#065F46' : '#6B7280',
        }}>
          {tender.status === 'open' ? 'Open' : 'Closed'}
        </span>
      </div>

      {/* Info row */}
      <div style={infoRow}>
        <div style={infoItem}><span style={infoLabel}>Deadline</span><span style={infoValue}>{formatDate(tender.endDate)}</span></div>
        <div style={infoItem}><span style={infoLabel}>Start Date</span><span style={infoValue}>{formatDate(tender.startDate)}</span></div>
        {tender.additionalDetails && (
          <div style={{ ...infoItem, flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={infoLabel}>Details</span>
            <span style={{ ...infoValue, marginTop: '2px' }}>{tender.additionalDetails}</span>
          </div>
        )}
      </div>

      {/* 3 action buttons */}
      {!editing && (
        <div style={actionsGrid}>
          {tender.sketchId && (
            <button style={actionCard} onClick={() => setOpenSketchId(tender.sketchId)}>
              <span style={actionIcon}>🖼️</span>
              <span style={actionLabel}>View Full Sketch</span>
            </button>
          )}
          <button style={actionCard} onClick={() => setOpenProposals(true)}>
            <span style={actionIcon}>📋</span>
            <span style={actionLabel}>View Proposals</span>
          </button>
          <button style={{ ...actionCard, borderColor: '#06B6D4' }} onClick={() => setEditing(true)}>
            <span style={actionIcon}>✏️</span>
            <span style={{ ...actionLabel, color: '#0E7490' }}>Edit Details</span>
          </button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSave} style={editForm}>
          <h4 style={{ margin: '0 0 16px', color: '#2E3A8A', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
            Edit Tender #{tender.tenderId}
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
            <div className="profile-field-group">
              <label>Writer / Tender Creator</label>
              <input type="text" className="form-input" disabled value={tender.writerName || '—'} />
            </div>
            <div className="profile-field-group">
              <label>Comic Sketch Preview</label>
              <div style={{ padding: '10px 14px', background: '#F3F4F6', border: '2px dashed #9333EA', borderRadius: '8px', fontSize: '13px', color: '#9333EA', fontWeight: '600' }}>
                🖼️ Sketch #{tender.sketchId || 'N/A'} attached
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
            <div className="profile-field-group">
              <label>Tender Start Date</label>
              <input type="date" className="form-input" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="profile-field-group">
              <label>Tender End Date (Deadline)</label>
              <input type="date" className="form-input" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>

          <div className="profile-field-group" style={{ marginBottom: '14px' }}>
            <label>Additional Details & Requirements for Artists</label>
            <textarea rows="3" className="form-input"
              placeholder="Add notes, preferred art style, budget, etc..."
              value={form.details}
              onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
          </div>

          {formError && <p style={{ color: '#EF4444', fontSize: '13px', margin: '0 0 10px' }}>{formError}</p>}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn-purple" style={{ margin: 0, flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none', background: '#6B7280', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {openSketchId && <SketchModal sketchId={openSketchId} onClose={() => setOpenSketchId(null)} />}
      {openProposals && <ProposalsModal tenderId={tender.tenderId} onClose={() => setOpenProposals(false)} />}
    </div>
  );
}

/* ── Styles ── */
const listCard = {
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px',
  padding: '14px 18px', cursor: 'pointer',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  transition: 'box-shadow 0.15s',
};
const backBtn = {
  padding: '6px 14px', borderRadius: '8px',
  border: '1px solid #E5E7EB', background: '#F9FAFB',
  cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151',
};
const infoRow = {
  display: 'flex', gap: '24px', flexWrap: 'wrap',
  background: '#F8FAFF', borderRadius: '10px', padding: '14px 18px',
  marginBottom: '24px', border: '1px solid #E0E7FF',
};
const infoItem = { display: 'flex', alignItems: 'center', gap: '8px' };
const infoLabel = { fontSize: '12px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' };
const infoValue = { fontSize: '14px', color: '#1E293B', fontWeight: '600' };
const actionsGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '14px', marginBottom: '20px',
};
const actionCard = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '10px', padding: '24px 16px',
  background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '12px',
  cursor: 'pointer', transition: 'box-shadow 0.15s',
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
};
const actionIcon = { fontSize: '28px' };
const actionLabel = { fontSize: '14px', fontWeight: '600', color: '#374151' };
const editForm = {
  background: '#F9FAFB', border: '1px dashed #06B6D4',
  borderRadius: '12px', padding: '20px',
};
