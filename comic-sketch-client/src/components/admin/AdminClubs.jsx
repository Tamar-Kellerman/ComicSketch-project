import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5286';

const emptyForm = { clubType: '', costs: '', sketchesPerMonth: '' };

export default function AdminClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchClubs = () => {
    setLoading(true);
    fetch(`${API}/api/clubs`)
      .then(r => r.json())
      .then(data => { setClubs(data); setLoading(false); })
      .catch(() => { setError('Error loading plans'); setLoading(false); });
  };

  useEffect(() => { fetchClubs(); }, []);

  const startEdit = (club) => {
    setEditingId(club.clubId);
    setForm({ clubType: club.clubType, costs: club.costs, sketchesPerMonth: club.sketchesPerMonth });
    setShowAddForm(false);
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  const handleSaveEdit = async () => {
    const res = await fetch(`${API}/api/clubs/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId: editingId, clubType: form.clubType, costs: parseFloat(form.costs), sketchesPerMonth: parseInt(form.sketchesPerMonth) }),
    });
    if (res.ok) { fetchClubs(); cancelEdit(); }
    else alert('Error updating plan');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete plan "${name}"?`)) return;
    const res = await fetch(`${API}/api/clubs/${id}`, { method: 'DELETE' });
    if (res.ok) setClubs(prev => prev.filter(c => c.clubId !== id));
    else alert('Error deleting plan');
  };

  const handleAdd = async () => {
    if (!form.clubType || !form.costs || !form.sketchesPerMonth) { alert('Please fill in all fields'); return; }
    const res = await fetch(`${API}/api/clubs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubType: form.clubType, costs: parseFloat(form.costs), sketchesPerMonth: parseInt(form.sketchesPerMonth) }),
    });
    if (res.ok) { fetchClubs(); setShowAddForm(false); setForm(emptyForm); }
    else alert('Error adding plan');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Plan Management</h2>
        <button
          className="btn-purple"
          style={{ padding: '9px 20px', borderRadius: '8px', cursor: 'pointer' }}
          onClick={() => { setShowAddForm(!showAddForm); cancelEdit(); }}
        >
          {showAddForm ? 'Cancel' : '+ Add Plan'}
        </button>
      </div>

      {showAddForm && (
        <div style={formBox}>
          <h4 style={{ marginTop: 0 }}>New Plan</h4>
          <FormFields form={form} setForm={setForm} />
          <button onClick={handleAdd} className="btn-purple" style={saveBtn}>Save</button>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && clubs.map(club => (
        <div key={club.clubId} style={cardStyle}>
          {editingId === club.clubId ? (
            <>
              <FormFields form={form} setForm={setForm} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={handleSaveEdit} className="btn-purple" style={saveBtn}>Save</button>
                <button onClick={cancelEdit} style={cancelBtn}>Cancel</button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px' }}>{club.clubType}</div>
                <div style={{ color: '#6B7280', fontSize: '13px', marginTop: '4px' }}>
                  Cost: ₪{club.costs} | Sketches per month: {club.sketchesPerMonth}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => startEdit(club)} style={editBtn}>Edit</button>
                <button onClick={() => handleDelete(club.clubId, club.clubType)} style={deleteBtn}>Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FormFields({ form, setForm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input className="form-input" placeholder="Plan name" value={form.clubType} onChange={e => setForm(f => ({ ...f, clubType: e.target.value }))} />
      <input className="form-input" placeholder="Cost (₪)" type="number" value={form.costs} onChange={e => setForm(f => ({ ...f, costs: e.target.value }))} />
      <input className="form-input" placeholder="Sketches per month" type="number" value={form.sketchesPerMonth} onChange={e => setForm(f => ({ ...f, sketchesPerMonth: e.target.value }))} />
    </div>
  );
}

const formBox = { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px', marginBottom: '20px' };
const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const saveBtn = { padding: '8px 18px', borderRadius: '8px', cursor: 'pointer' };
const cancelBtn = { padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', background: '#f3f4f6', border: '1px solid #d1d5db' };
const editBtn = { background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer' };
const deleteBtn = { background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer' };
