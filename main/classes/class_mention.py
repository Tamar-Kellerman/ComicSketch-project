
# מחלקה שמייצגת אזכור בודד של ישות בטקסט — מיקום + הטקסט עצמו
class Mention:
    # מאתחלת אזכור עם טווח תווים וטקסט
    def __init__(self, start, end, text):
        self.start = start  # אינדקס תו ההתחלה בטקסט
        self.end = end      # אינדקס תו הסוף בטקסט
        self.text = text    # הטקסט של האזכור

    # מדפיסה את פרטי האזכור לצורכי debug
    def show_details(self):
        print(f"Start Index: {self.start}, End Index: {self.end}, Text: {self.text}")
