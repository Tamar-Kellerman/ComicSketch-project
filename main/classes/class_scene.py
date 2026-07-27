class Scene:
    def __init__(self, location, time, characters, text, split_reason, start_char, end_char, sentence_count):
        self.location       = location       # רשימת מיקומים בסצנה
        self.time           = time           # רשימת ביטויי זמן בסצנה
        self.characters     = characters     # רשימת דמויות בסצנה
        self.text           = text           # הטקסט המלא של הסצנה
        self.split_reason   = split_reason   # הסיבה לפיצול: ["place"] / ["time"] / ["place", "time"]
        self.start_char     = start_char     # מיקום תחילת הסצנה בטקסט המקורי (בתווים)
        self.end_char       = end_char       # מיקום סוף הסצנה בטקסט המקורי (בתווים)
        self.sentence_count = sentence_count # מספר המשפטים בסצנה
