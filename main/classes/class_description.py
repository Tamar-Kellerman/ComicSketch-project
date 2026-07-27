from classes.class_mention import Mention

# תיאור של דמות — יורש מ-Mention כי גם לו יש טווח ותוכן טקסטואלי
class Description(Mention):
    # מוסיף על Mention שדה type שמציין את סוג התיאור התחבירי
    def __init__(self, start, end, text, type):
        super().__init__(start, end, text)  # מאתחל start, end, text דרך המחלקה האב
        self.type = type  # סוג התיאור: amod, appos, copular, participle וכו'

    # מדפיסה פרטי תיאור כולל הסוג
    def show_details(self):
        super().show_details()       # מדפיסה start, end, text
        print(f"Type: {self.type}")  # מוסיפה את סוג התיאור
