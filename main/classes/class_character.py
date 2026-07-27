from classes.class_mention import Mention
from classes.class_description import Description

# מייצגת דמות בסיפור — כולל שם, קטגוריה, ציון, כל האזכורים והתיאורים שלה
class Character:
    # ממיר שם טקסט למספר — חלק מחישוב המזהה הייחודי
    @staticmethod
    def convert(text):
        return sum(ord(c) for c in text)  # סכום ערכי ASCII של כל תו בשם

    # מאתחלת דמות עם כל שדותיה
    def __init__(self, name, label, score, mentions: list[Mention], description: list[Description]):
        self.idx = self.convert(name) + mentions[0].start + mentions[0].end  # מזהה ייחודי: שם + מיקום האזכור הראשון
        self.name = name          # שם הדמות כפי שמופיע בטקסט
        self.label = label        # קטגוריה מ-GLiNER: character, animal, relative וכו'
        self.score = score        # ציון הביטחון של GLiNER לזיהוי הדמות
        self.mentions = mentions  # רשימת כל המקומות שבהם הדמות מוזכרת בטקסט
        self.description = description  # רשימת התיאורים שנאספו עבור הדמות
        self.final_description = ""

    # מדפיסה את כל מידע הדמות — שימושי לבדיקות
    def show_details(self):
        print(f"Index: {self.idx}")
        print(f"Name: {self.name}")
        print(f"Label: {self.label}")
        print(f"Score: {self.score}")
        print("Mentions:")
        for mention in self.mentions:    # עוברת על כל האזכורים ומדפיסה כל אחד
            mention.show_details()
        print("Description:")
        for desc in self.description:   # עוברת על כל התיאורים ומדפיסה כל אחד
            desc.show_details()
