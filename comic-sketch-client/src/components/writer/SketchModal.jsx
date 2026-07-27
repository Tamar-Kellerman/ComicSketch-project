import React, { useState, useEffect } from 'react';
import SceneCard from './SceneCard';
import { jsPDF } from 'jspdf';


const API = 'http://localhost:5286';

export default function SketchModal({ sketchId, onClose }) {
  const [sketch, setSketch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  useEffect(() => {
    fetch(`${API}/api/sketches/${sketchId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setSketch({
          ...data,
          characters: data.charactersJson ? JSON.parse(data.charactersJson) : [],
          scenes: data.scenesJson ? JSON.parse(data.scenesJson) : [],
          locations: data.locationsJson ? JSON.parse(data.locationsJson) : [],
        });
        setLoading(false);
      })
      .catch(() => { setError('Failed to load sketch.'); setLoading(false); });
  }, [sketchId]);

  const handleDownloadPDF = () => {
    if (!sketch) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const maxW = pageW - margin * 2;
    let y = 20;

    const addText = (text, size, bold, color = [30, 30, 30]) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ''), maxW);
      lines.forEach(line => {
        if (y > 272) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += size * 0.45;
      });
    };

    const addLine = (color = [229, 231, 235]) => {
      if (y > 272) { doc.addPage(); y = 20; }
      doc.setDrawColor(...color);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
    };

    // Title
    addText(sketch.sketchTitle || `Sketch #${sketchId}`, 20, true, [46, 58, 138]);
    y += 4;
    addLine([6, 182, 212]);
    y += 2;

    // Characters
    addText('Characters', 13, true, [124, 58, 237]);
    y += 3;
    sketch.characters.forEach(char => {
      addText(char.name, 12, true, [55, 65, 81]);
      if (char.final_description) addText(char.final_description, 10, false, [107, 114, 128]);
      y += 2;
    });

    y += 4;
    addLine();

    // Scenes
    addText('Scene Breakdown', 13, true, [6, 182, 212]);
    y += 3;
    sketch.scenes.forEach((scene, i) => {
      const loc = Array.isArray(scene.location) ? scene.location.join(', ') : scene.location || '';
      const time = Array.isArray(scene.time) ? scene.time.join(', ') : scene.time || '';
      const meta = loc ? `Location: ${loc}` : time ? `Time: ${time}` : 'Opening';
      addText(`Scene ${i}  —  ${meta}`, 11, true, [55, 65, 81]);
      addText(scene.text, 10, false, [75, 85, 99]);
      if (scene.characters?.length) {
        addText(`Characters: ${scene.characters.join(', ')}`, 9, false, [156, 163, 175]);
      }
      y += 4;
    });

    doc.save(`sketch-${sketchId}.pdf`);
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #06B6D4', paddingBottom: '14px' }}>
          <h3 style={{ margin: 0, color: '#2E3A8A', fontSize: '20px' }}>{sketch?.sketchTitle || `Sketch #${sketchId}`}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {sketch && (
              <button onClick={handleDownloadPDF} style={downloadBtn} title="Download as PDF">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download PDF
              </button>
            )}
            <button onClick={onClose} style={closeBtn}>✕</button>
          </div>
        </div>

        {loading && <p style={{ color: '#6B7280' }}>Loading...</p>}
        {error && <p style={{ color: '#EF4444' }}>{error}</p>}

        {sketch && (
          <>
            {/* Characters */}
            <section style={{ marginBottom: '28px' }}>
              <h4 style={sectionTitle}>Characters</h4>
              {sketch.characters.length === 0
                ? <p style={empty}>No characters found.</p>
                : sketch.characters.map((char, i) => (
                  <div key={i} style={charCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#7C3AED' }}>{char.name}</span>
                        <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '400', marginLeft: '6px' }}>{char.label}</span>
                      </div>
                      {char.descriptions?.length > 0 && (
                        <button style={toggleBtn} onClick={() => setExpandedDescriptions(p => ({ ...p, [i]: !p[i] }))}>
                          {expandedDescriptions[i] ? 'Hide raw descriptions' : `Show raw descriptions (${char.descriptions.length})`}
                        </button>
                      )}
                    </div>
                    {char.final_description
                      ? <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>{char.final_description}</p>
                      : <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>No final description available.</p>
                    }
                    {expandedDescriptions[i] && char.descriptions?.length > 0 && (
                      <div style={{ marginTop: '10px', padding: '10px 14px', background: '#FAF5FF', borderRadius: '8px', border: '1px solid #EDE9FE' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Raw descriptions collected by spaCy
                        </p>
                        {char.descriptions.map((d, j) => (
                          <div key={j} style={{ fontSize: '13px', color: '#4B5563', padding: '3px 0', borderBottom: j < char.descriptions.length - 1 ? '1px solid #EDE9FE' : 'none' }}>
                            <span style={{ color: '#9CA3AF', fontSize: '11px', marginRight: '6px' }}>[{d.type}]</span>
                            "{d.text}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              }
            </section>

            {/* Locations */}
            {sketch.locations?.length > 0 && (
              <section style={{ marginBottom: '28px' }}>
                <h4 style={sectionTitle}>Locations</h4>
                {sketch.locations.map((loc, i) => (
                  <div key={i} style={locCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: '#0E7490' }}>📍 {loc.name}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' }}>{loc.label}</span>
                    </div>
                    {loc.descriptions?.length > 0 ? (
                      <div>
                        <p style={{ margin: '0 0 5px', fontSize: '11px', fontWeight: '700', color: '#0E7490', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Descriptions found by spaCy
                        </p>
                        {loc.descriptions.map((d, j) => (
                          <div key={j} style={{ fontSize: '13px', color: '#4B5563', padding: '3px 0', borderBottom: j < loc.descriptions.length - 1 ? '1px solid #BAE6FD' : 'none' }}>
                            <span style={{ color: '#9CA3AF', fontSize: '11px', marginRight: '6px' }}>[{d.type}]</span>
                            "{d.text}"
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>No descriptions found.</p>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Scenes */}
            <section>
              <h4 style={sectionTitle}>Scene Breakdown</h4>
              {sketch.scenes.length === 0
                ? <p style={empty}>No scenes found.</p>
                : sketch.scenes.map((scene, i) => (
                  <SceneCard key={i} scene={scene} index={i} />
                ))
              }
            </section>
          </>
        )}
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
  width: '100%', maxWidth: '680px', maxHeight: '85vh',
  overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
const closeBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '18px', color: '#9CA3AF',
};
const downloadBtn = {
  display: 'flex', alignItems: 'center',
  padding: '7px 14px', borderRadius: '8px',
  background: '#2E3A8A', color: '#fff',
  border: 'none', cursor: 'pointer',
  fontSize: '13px', fontWeight: '600',
};
const sectionTitle = {
  color: '#2E3A8A', fontSize: '15px', fontWeight: '700',
  borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', marginBottom: '14px',
};
const charCard = {
  background: '#fff', border: '1px solid #E9D5FF',
  borderLeft: '4px solid #9333EA',
  borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
  boxShadow: '0 1px 4px rgba(147,51,234,0.07)',
};
const empty = { color: '#9CA3AF', fontSize: '14px' };
const locCard = {
  background: '#fff', border: '1px solid #BAE6FD',
  borderLeft: '4px solid #06B6D4',
  borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
  boxShadow: '0 1px 4px rgba(6,182,212,0.07)',
};
const toggleBtn = {
  fontSize: '12px', fontWeight: '600', color: '#7C3AED',
  background: '#FAF5FF', border: '1px solid #DDD6FE',
  borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
};
