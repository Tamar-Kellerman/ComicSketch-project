// import React, { useState, useEffect } from 'react';

// export default function ArtistTenders() {
//   const [tenders, setTenders] = useState([]);
//   const [selectedTender, setSelectedTender] = useState(null);
//   const [uploadFile, setUploadFile] = useState(null);
//   const [submitting, setSubmitting] = useState(false);

//   // שליפת המכרזים הפתוחים מהשרת בעת טעינת הרכיב
//   useEffect(() => {
//     fetch('https://api.comicsketch.co.il/v1/tenders/open')
//       .then(res => res.json())
//       .then(data => setTenders(data.tenders))
//       .catch(err => console.error("שגיאה בטעינת מכרזים:", err));
//   }, []);

//   const handleFileChange = (e) => {
//     setUploadFile(e.target.files[0]);
//   };

//   const handleSubmitProposal = async (e) => {
//     e.preventDefault();
//     if (!uploadFile) return alert("אנא העלי קובץ תמונה של הדוגמה המאוירת שלך");

//     setSubmitting(true);
    
//     // שימוש ב-FormData לצורך העלאת קובץ בינארי (Image Upload)
//     const formData = new FormData();
//     formData.append('tenderId', selectedTender.id);
//     formData.append('samplePage', uploadFile);

//     try {
//       const response = await fetch('https://api.comicsketch.co.il/v1/proposals/submit', {
//         method: 'POST',
//         body: formData // שליחת ה-Form עם קובץ התמונה לשרת
//       });

//       if (response.ok) {
//         alert("הצעתך הוגשה בהצלחה לסופר!");
//         setSelectedTender(null);
//         setUploadFile(null);
//       }
//     } catch (error) {
//       console.error("שגיאה בהגשת ההצעה:", error);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div style={{ padding: '20px', direction: 'rtl' }}>
//       <h2>לוח מכרזים פתוחים לציירים</h2>

//       {!selectedTender ? (
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
//           {tenders.map(tender => (
//             <div key={tender.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '6px' }}>
//               <h3>שם הפרויקט: {tender.projectName}</h3>
//               <p><strong>תקציר העלילה:</strong> {tender.storySummary}</p>
//               <p><strong>מספר משבצות בסקיצה:</strong> {tender.panelsCount}</p>
//               <button 
//                 onClick={() => setSelectedTender(tender)}
//                 style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
//               >
//                 צפייה בסקיצה והגשת מועמדות
//               </button>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <div style={{ border: '1px solid #007bff', padding: '20px', borderRadius: '8px' }}>
//           <button onClick={() => setSelectedTender(null)} style={{ marginBottom: '15px' }}>חזרה לרשימה</button>
//           <h3>הגשת הצעה עבור פרויקט: {selectedTender.projectName}</h3>
          
//           <div style={{ backgroundColor: '#f9f9f9', padding: '15px', marginBottom: '20px' }}>
//             <h4>תיאור פריסת הריבועים בסקיצה:</h4>
//             {selectedTender.panels.map((p, idx) => (
//               <p key={p.id}><strong>ריבוע {idx+1}:</strong> {p.promptText}</p>
//             ))}
//           </div>

//           {/* טופס העלאת קובץ התמונה עבור המכרז */}
//           <form onSubmit={handleSubmitProposal}>
//             <div style={{ marginBottom: '15px' }}>
//               <label style={{ display: 'block', marginBottom: '5px' }}><strong>העלי עמוד אחד מאויר לדוגמה (PNG/JPEG):</strong></label>
//               <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
//             </div>
            
//             <button 
//               type="submit" 
//               disabled={submitting} 
//               style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}
//             >
//               {submitting ? 'מעלה קובץ ומגיש הצעה...' : 'שלח הצעה לסופר'}
//             </button>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// }