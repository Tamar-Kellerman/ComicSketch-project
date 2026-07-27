
# מייצגת מילה בודדת בטקסט עם תגיות דקדוקיות
class Words:
    # מאתחלת מילה עם מיקום, תוכן ותגיות
    def __init__(self, idx, word, pos, tag, mentions=None, Descriptions=None):
        self.idx = idx    # מיקום המילה ברצף הטקסט
        self.word = word  # הטקסט של המילה
        self.pos = pos    # חלק דיבור: NOUN, VERB, ADJ וכו'
        self.tag = tag    # תג דקדוקי מפורט יותר מ-pos
        # self.mentions = mentions or set()
        # self.Descriptions = Descriptions or set()

    # מדפיסה פרטי המילה
    def show_details(self):
        print(f"Index: {self.idx}, Word: {self.word}, POS: {self.pos}, Tag: {self.tag}")
