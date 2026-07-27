class Sentence:
    def __init__(self, idx, start, end, text, spacy_sent):
        self.idx        = idx         # אינדקס המשפט ברשימה
        self.start      = start       # מיקום תחילת המשפט בטקסט המקורי (בתווים)
        self.end        = end         # מיקום סוף המשפט בטקסט המקורי (בתווים)
        self.text       = text        # טקסט המשפט
        self.spacy_sent = spacy_sent  # ה-Span של spaCy
        self.times      = []          # ביטויי זמן שנמצאו במשפט — רשימת מחרוזות
        self.places     = []          # מיקומים שנמצאו — רשימת {"text": ..., "role": ...}
        self.characters = []          # דמויות שנמצאו במשפט — רשימת מחרוזות
