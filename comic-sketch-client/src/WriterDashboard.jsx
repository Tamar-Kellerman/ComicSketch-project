// import React, { useState } from 'react';

// export default function WriterDashboard() {
//   const [storyText, setStoryText] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [comicSketch, setComicSketch] = useState(null);

//   const handleGenerateSketch = async () => {
//     if (!storyText.trim()) return alert("אנא הכניסי טקסט לסיפור");
    
//     setLoading(true);
//     try {
//       // שליחת הסיפור לשרת הראשי (המפעיל את שרת ה-NLP)
//       const response = await fetch('https://api.comicsketch.co.il/v1/sketches/generate', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ text: storyText })
//       });
//       const data = await response.json();
//       setComicSketch(data.sketch); // מניח שהשרת מחזיר אובייקט סקיצה מחולק לריבועים
//     } catch (error) {
//       console.error("שגיאה ביצירת הסקיצה:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePublishToTender = async () => {
//     try {
//       // העלאת הסקיצה המוצרכת למכרז פתוח לציירים
//       await fetch(`https://api.comicsketch.co.il/v1/tenders/publish`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ sketchId: comicSketch.id })
//       });
//       alert("הסקיצה הועלתה בהצלחה למכרז עבור הציירים!");
//     } catch (error) {
//       console.error("שגיאה בפרסום המכרז:", error);
//     }
//   };

//   return (
//     <div style={{ padding: '20px', direction: 'rtl' }}>
//       <h2>לוח בקרה לסופר - ComicSketch</h2>
      
//       <div style={{ marginBottom: '20px' }}>
//         <label><h3>הכניסי את הסיפור המילולי שלך:</h3></label>
//         <textarea 
//           rows="8" 
//           style={{ width: '100%', padding: '10px', fontSize: '16px' }}
//           value={storyText}
//           onChange={(e) => setStoryText(e.target.value)}
//           placeholder="היה היה פעם..."
//         />
//         <button 
//           onClick={handleGenerateSketch} 
//           disabled={loading}
//           style={{ marginTop: '10px', padding: '10px 20px', cursor: 'pointer' }}
//         >
//           {loading ? 'ה-AI מנתח את הטקסט ומייצר סקיצה...' : 'ייצר סקיצה ראשונית'}
//         </button>
//       </div>

//       {comicSketch && (
//         <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
//           <h3>הסקיצה שנוצרה (חלוקה לריבועי קומיקס):</h3>
          
//           {/* תצוגת גריד של משבצות הקומיקס שנוצרו מה-NLP */}
//           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1xl)', gap: '15px', marginTop: '15px' }}>
//             {comicSketch.panels.map((panel, index) => (
//               <div key={panel.id} style={{ border: '2px dashed #666', padding: '15px', borderRadius: '4px' }}>
//                 <h4>משבצת {index + 1}</h4>
//                 <p><strong>דמויות:</strong> {panel.entities.join(', ')}</p>
//                 <p><strong>תיאור סצנה לצייר:</strong> {panel.promptText}</p>
//                 {panel.sketchImageUrl && (
//                   <img src={panel.sketchImageUrl} alt={`סקיצה ${index + 1}`} style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }} />
//                 )}
//               </div>
//             ))}
//           </div>

//           <button 
//             onClick={handlePublishToTender}
//             style={{ marginTop: '20px', padding: '12px 25px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}
//           >
//             אישור ופרסום המכרז לציירים
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }