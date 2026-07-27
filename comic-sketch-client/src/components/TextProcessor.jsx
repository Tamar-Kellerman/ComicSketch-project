import React, { useState } from 'react';

function TextProcessor() {
  const [inputText, setInputText] = useState('');
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError('');
    setCharacters([]);

    try {
      const baseUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${baseUrl}/api/text/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error('The server returned an error during processing');
      }

      const data = await response.json();
      setCharacters(data.processedText || []);
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing the text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial' }}>
      <h2>Text & Character Processor</h2>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Type or paste your story here..."
        style={{ width: '100%', height: '150px', padding: '10px', marginBottom: '10px', borderRadius: '5px', boxSizing: 'border-box' }}
      />

      <button
        onClick={handleSend}
        disabled={loading}
        style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        {loading ? 'Analyzing characters...' : 'Send for Processing'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

      <div style={{ marginTop: '20px' }}>
        <h3>Characters found ({characters.length}):</h3>

        {characters.length === 0 && !loading && <p>No characters to display yet.</p>}

        <div style={{ display: 'grid', gap: '20px', marginTop: '10px' }}>
          {characters.map((char) => (
            <div key={char.idx} style={{ padding: '20px', border: '1px solid #ccd', borderRadius: '8px', backgroundColor: '#fdfdfd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>

              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0056b3' }}>{char.name}</span>
                <span style={{ marginRight: '15px', backgroundColor: '#e2e3e5', padding: '3px 8px', borderRadius: '4px', fontSize: '13px' }}>Label: {char.label}</span>
                <span style={{ marginRight: '10px', color: '#6c757d', fontSize: '13px' }}>Score: {char.score?.toFixed(2)}</span>
              </div>

              {char.final_description && (
                <div style={{ marginBottom: '15px', backgroundColor: '#f0f7ff', padding: '10px', borderRadius: '6px', borderRight: '4px solid #0056b3' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#0056b3' }}>Final Description (AI):</h4>
                  <p style={{ margin: 0, fontSize: '15px' }}>{char.final_description}</p>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#28a745' }}>Descriptions & Traits:</h4>
                {char.descriptions.length === 0 ? <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>No explicit descriptions found.</p> : (
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {char.descriptions.map((desc, idx) => (
                      <li key={idx} style={{ marginBottom: '4px', fontSize: '15px' }}>
                        <strong>"{desc.text}"</strong> <span style={{ color: '#6c757d', fontSize: '13px' }}>(type: {desc.type} | position: {desc.start}-{desc.end})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#17a2b8' }}>Appears in text as:</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {char.mentions.map((mention, idx) => (
                    <span key={idx} style={{ backgroundColor: '#e1f5fe', color: '#0288d1', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      {mention.text} <small style={{ color: '#555' }}>({mention.start}-{mention.end})</small>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TextProcessor;
