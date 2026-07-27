from classes.class_mention import Mention
from classes.class_description import Description

# מייצגת מיקום בסיפור — כולל שם, קטגוריה, ציון, כל האזכורים והתיאורים שלו
class Location:
    # ממיר שם טקסט למספר — חלק מחישוב המזהה הייחודי
    @staticmethod
    def convert(text):
        return sum(ord(c) for c in text)

    def __init__(self, name, label, score, mentions: list[Mention], description: list[Description], role: str = "UNKNOWN"):
        self.idx         = self.convert(name) + mentions[0].start + mentions[0].end
        self.name        = name          # שם המיקום כפי שמופיע בטקסט
        self.label       = label         # קטגוריה מ-GLiNER: location, facility וכו'
        self.score       = score         # ציון הביטחון של GLiNER
        self.mentions    = mentions      # רשימת כל האזכורים בטקסט
        self.description = description   # רשימת תיאורים שנאספו
        self.role        = role          # REAL_LOCATION / TRANSITION_LOCATION / PLANNED_DESTINATION / MENTIONED_LOCATION

    def show_details(self):
        print(f"Index: {self.idx}")
        print(f"Name: {self.name}")
        print(f"Label: {self.label}")
        print(f"Score: {self.score}")
        print(f"Role: {self.role}")
        print("Mentions:")
        for mention in self.mentions:
            mention.show_details()
        print("Descriptions:")
        for desc in self.description:
            desc.show_details()
