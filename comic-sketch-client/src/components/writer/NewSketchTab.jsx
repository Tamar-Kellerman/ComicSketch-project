import React, { useState } from 'react';
import SceneCard from './SceneCard';
import { validators } from '../../utils/validation';

const API = 'http://localhost:5286';

export default function NewSketchTab({ writerName, writerId, onTenderPublished }) {
  const [storyStep, setStoryStep] = useState(1);
  const [storyText, setStoryText] = useState('');
  const [tenderData, setTenderData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    moreDetails: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [detectedCharacters, setDetectedCharacters] = useState([]);
  const [detectedScenes, setDetectedScenes] = useState([]);
  const [detectedLocations, setDetectedLocations] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [savedSketchId, setSavedSketchId] = useState(null);
  const [errors, setErrors] = useState({});
  const [sketchTitle, setSketchTitle] = useState('');
  const [titleSaved, setTitleSaved] = useState(false);

  // Saves the sketch (characters + scenes + story) to the DB, returns sketchId
  const saveSketchToDB = async (characters, scenes, story, locations = []) => {
    const payload = {
      userId: writerId,
      sketchLink: '',
      originalStory: story,
      charactersJson: JSON.stringify(characters),
      scenesJson: JSON.stringify(scenes),
      locationsJson: JSON.stringify(locations),
    };
    const res = await fetch(`${API}/api/sketches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save sketch to database');
    const saved = await res.json();
    return saved.sketchId;
  };

  const handleProcessText = async () => {
    const storyError = validators.storyText(storyText);
    if (storyError) { setErrors({ storyText: storyError }); return; }
    setErrors({});

    setIsProcessing(true);
    try {
      // Step 1: analyze text via Python (through C# proxy)
      const response = await fetch(`${API}/api/text/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: storyText }),
      });
      if (!response.ok) throw new Error();

      const data = await response.json();
      const characters = data.processedText || [];
      const scenes = data.scenes || [];
      const locations = data.locations || [];

      setDetectedCharacters(characters);
      setDetectedScenes(scenes);
      setDetectedLocations(locations);

      // Step 2: save sketch to DB
      const sketchId = await saveSketchToDB(characters, scenes, storyText, locations);
      setSavedSketchId(sketchId);

      const autoTitle = characters[0]?.name || '';
      setSketchTitle(autoTitle);
      setTitleSaved(false);
    } catch (err) {
      setErrors({ storyText: 'An error occurred while processing the story. Make sure both servers are running.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!savedSketchId) return;
    const finalTitle = sketchTitle.trim() || detectedCharacters[0]?.name || 'My Sketch';
    await fetch(`${API}/api/sketches/${savedSketchId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalTitle),
    });
    setSketchTitle(finalTitle);
    setTitleSaved(true);
  };

  const handleGoToTender = async () => {
    const storyError = validators.storyText(storyText);
    if (storyError) { setErrors({ storyText: storyError }); return; }
    setErrors({});

    // If user skips "Generate Sketch" and goes straight to tender, save now
    if (!savedSketchId) {
      try {
        const sketchId = await saveSketchToDB(detectedCharacters, detectedScenes, storyText);
        setSavedSketchId(sketchId);
      } catch {
        setErrors({ storyText: 'Failed to save sketch. Please try again.' });
        return;
      }
    }

    setStoryStep(2);
  };

  const handlePublishTender = async (e) => {
    e.preventDefault();
    const endDateError = validators.endDate(tenderData.endDate);
    if (endDateError) { setErrors({ endDate: endDateError }); return; }
    setErrors({});

    setIsPublishing(true);
    try {
      const payload = {
        userId: writerId,
        sketchId: savedSketchId || null,
        startDate: tenderData.startDate,
        endDate: tenderData.endDate,
        additionalDetails: tenderData.moreDetails || null,
      };

      const res = await fetch(`${API}/api/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      const tender = await res.json();
      alert(`Tender #${tender.tenderId} published successfully!`);

      // Reset state
      setStoryText('');
      setStoryStep(1);
      setDetectedCharacters([]);
      setDetectedScenes([]);
      setSavedSketchId(null);
      setTenderData({ startDate: new Date().toISOString().split('T')[0], endDate: '', moreDetails: '' });
      setSketchTitle('');
      setTitleSaved(false);
      setDetectedLocations([]);
      setExpandedDescriptions({});

      if (typeof onTenderPublished === 'function') onTenderPublished();
    } catch {
      setErrors({ general: 'Failed to publish tender. Please try again.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const ErrorMsg = ({ field }) =>
    errors[field] ? <p style={{ color: '#EF4444', fontSize: '13px', margin: '5px 0 0' }}>{errors[field]}</p> : null;

  return (
    <div>
      {storyStep === 1 ? (
        <div>
          <h3 style={{ borderBottom: '2px solid #9333EA', paddingBottom: '10px', color: '#2E3A8A' }}>
            Create a New Comic Sketch from Your Story
          </h3>
          <textarea rows="6" className="form-input"
            placeholder="Paste your story here (at least 20 characters)..."
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)} />
          <ErrorMsg field="storyText" />

          {savedSketchId && (
            <div style={{ marginTop: '14px', background: '#F0FDF4', border: '1px solid #6EE7B7', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ color: '#059669', fontSize: '13px', margin: '0 0 10px', fontWeight: '600' }}>
                ✓ Sketch saved successfully!
              </p>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Sketch Name
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, margin: 0 }}
                  placeholder={detectedCharacters[0]?.name || 'Enter sketch name...'}
                  value={sketchTitle}
                  onChange={e => { setSketchTitle(e.target.value); setTitleSaved(false); }}
                />
                <button
                  type="button"
                  className="btn-cyan"
                  style={{ margin: 0, whiteSpace: 'nowrap' }}
                  onClick={handleSaveTitle}
                >
                  {titleSaved ? '✓ Saved' : 'Save Name'}
                </button>
              </div>
              {!sketchTitle && (
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '5px 0 0' }}>
                  If left empty, the name will be: <strong>{detectedCharacters[0]?.name || 'My Sketch'}</strong>
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button className="btn-purple" disabled={isProcessing} onClick={handleProcessText}>
              {isProcessing ? 'Analyzing story...' : 'Generate Sketch'}
            </button>
            <button className="btn-purple" style={{ backgroundColor: '#06B6D4' }}
              disabled={isProcessing} onClick={handleGoToTender}>
              Upload Sketch to Tender
            </button>
          </div>

          {/* ── Characters ── */}
          {detectedCharacters.length > 0 && (
            <div style={sectionBox}>
              <h4 style={sectionHeader}>Characters</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {detectedCharacters.map((char) => (
                  <div key={char.idx} style={charCard}>
                    {/* Name row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: '#7C3AED' }}>{char.name}</span>
                      {char.descriptions?.length > 0 && (
                        <button
                          style={toggleBtn}
                          onClick={() => setExpandedDescriptions(p => ({ ...p, [char.idx]: !p[char.idx] }))}
                        >
                          {expandedDescriptions[char.idx] ? 'Hide raw descriptions' : `Show raw descriptions (${char.descriptions.length})`}
                        </button>
                      )}
                    </div>
                    {/* Final description */}
                    {char.final_description
                      ? <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{char.final_description}</p>
                      : <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF' }}>No final description.</p>
                    }
                    {/* Raw descriptions (expandable) */}
                    {expandedDescriptions[char.idx] && (
                      <div style={{ marginTop: '10px', padding: '10px 14px', background: '#FAF5FF', borderRadius: '8px', border: '1px solid #EDE9FE' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Raw descriptions collected by spaCy
                        </p>
                        {char.descriptions.map((d, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#4B5563', padding: '3px 0', borderBottom: i < char.descriptions.length - 1 ? '1px solid #EDE9FE' : 'none' }}>
                            <span style={{ color: '#9CA3AF', fontSize: '11px', marginRight: '6px' }}>[{d.type}]</span>
                            "{d.text}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Locations ── */}
          {detectedLocations.length > 0 && (
            <div style={sectionBox}>
              <h4 style={sectionHeader}>Locations</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {detectedLocations.map((loc, i) => (
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
              </div>
            </div>
          )}

          {/* ── Scenes ── */}
          {detectedScenes.length > 0 && (
            <div style={sectionBox}>
              <h4 style={sectionHeader}>Scene Breakdown</h4>
              {detectedScenes.map((scene, index) => (
                <SceneCard key={index} scene={scene} index={index} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 style={{ borderBottom: '2px solid #06B6D4', paddingBottom: '10px', color: '#2E3A8A' }}>
            Publish Sketch as a New Tender
          </h3>

          <form onSubmit={handlePublishTender} className="profile-form-container">
            <div className="profile-grid">
              <div className="profile-field-group">
                <label>Writer / Tender Creator</label>
                <input type="text" className="form-input" disabled value={writerName} />
              </div>

              <div className="profile-field-group">
                <label>Comic Sketch Preview</label>
                <div className="sketch-preview-box" style={{ padding: '20px', backgroundColor: '#F3F4F6', border: '2px dashed #9333EA', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                  🖼️ Sketch Preview: "{storyText.substring(0, 30)}..."
                  {savedSketchId && <div style={{ fontSize: '12px', color: '#9333EA', marginTop: '6px' }}>Sketch ID: {savedSketchId}</div>}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
              <div className="profile-field-group">
                <label>Tender Start Date</label>
                <input type="date" className="form-input"
                  value={tenderData.startDate}
                  onChange={(e) => setTenderData({...tenderData, startDate: e.target.value})} />
              </div>

              <div className="profile-field-group">
                <label>Tender End Date (Submission Deadline)</label>
                <input type="date" className="form-input"
                  value={tenderData.endDate}
                  onChange={(e) => setTenderData({...tenderData, endDate: e.target.value})} />
                <ErrorMsg field="endDate" />
              </div>
            </div>

            <div className="profile-field-group" style={{ marginTop: '15px' }}>
              <label>Additional Details & Requirements for Artists</label>
              <textarea rows="4" className="form-input"
                placeholder="Add notes, preferred art style, budget, etc..."
                value={tenderData.moreDetails}
                onChange={(e) => setTenderData({...tenderData, moreDetails: e.target.value})} />
            </div>

            <ErrorMsg field="general" />

            <div className="profile-actions" style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
              <button type="button" onClick={() => setStoryStep(1)} className="btn-purple"
                style={{ backgroundColor: '#9CA3AF', flex: 1 }} disabled={isPublishing}>
                Back to Story
              </button>
              <button type="submit" className="btn-purple" style={{ backgroundColor: '#06B6D4', flex: 1 }} disabled={isPublishing}>
                {isPublishing ? 'Publishing...' : 'Publish Tender'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const sectionBox = {
  marginTop: '28px', borderTop: '1px solid #E5E7EB', paddingTop: '20px',
};
const sectionHeader = {
  color: '#2E3A8A', fontSize: '15px', fontWeight: '700',
  marginBottom: '14px',
};
const charCard = {
  padding: '14px 16px', border: '1px solid #E9D5FF',
  borderLeft: '4px solid #9333EA', borderRadius: '10px',
  background: '#fff', boxShadow: '0 1px 4px rgba(147,51,234,0.06)',
};
const locCard = {
  padding: '14px 16px', border: '1px solid #BAE6FD',
  borderLeft: '4px solid #06B6D4', borderRadius: '10px',
  background: '#fff', boxShadow: '0 1px 4px rgba(6,182,212,0.06)',
};
const toggleBtn = {
  fontSize: '12px', fontWeight: '600', color: '#7C3AED',
  background: '#FAF5FF', border: '1px solid #DDD6FE',
  borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
};
