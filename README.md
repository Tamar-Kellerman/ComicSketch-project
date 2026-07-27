מבנה הפרויקט
```
├── comic-sketch-client/   # צד לקוח - React (Vite)
├── ComicSketchAPI/        # צד שרת - C#
├── main/                  # שרת ה-AI - Python
├── Cross-Encoder/         # מודל AI (לא נכלל ב-repo - ראו הורדה למטה)
├── Sbert/                 # מודל AI (לא נכלל ב-repo - ראו הורדה למטה)
├── LingMessCoref/         # מודל AI (לא נכלל ב-repo - ראו הורדה למטה)
└── gliner_model/          # מודל AI (לא נכלל ב-repo - ראו הורדה למטה)
```
דרישות מקדימות
Node.js גרסה 18 ומעלה
Python גרסה 3.10 ומעלה
.NET SDK (גרסה X.X)
Git
התקנה והרצה
1. שכפול הפרויקט
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```
2. הורדת מודלי ה-AI
המודלים לא נכללים ב-repo בשל גודלם. יש להוריד אותם ולמקם בשורש הפרויקט, בתיקיות עם השמות המדויקים המופיעים במבנה למעלה:
מודל	קישור להורדה
Cross-Encoder	[קישור]
Sbert	[קישור]
LingMessCoref	[קישור]
gliner_model	[קישור]
3. הרצת צד השרת - Python
```bash
cd main
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Mac/Linux
pip install -r requirements.txt
python app.py
```
4. הרצת צד השרת - C# (ComicSketchAPI)
```bash
cd ComicSketchAPI
dotnet restore
dotnet run
```
5. הרצת צד הלקוח - React
```bash
cd comic-sketch-client
npm install
npm run dev
```
משתני סביבה
יש ליצור קובץ `.env` בכל אחת מהתיקיות הרלוונטיות (ראו `.env.example` אם קיים) עם המשתנים הבאים:
```
# דוגמה - יש לעדכן בהתאם לצורך בפועל
API_URL=http://localhost:5000
MODEL_PATH=./Cross-Encoder
```
טכנולוגיות
Frontend: React + Vite
Backend (API): C# / .NET
AI Server: Python
AI Models: Cross-Encoder, Sbert, LingMessCoref, GLiNER
