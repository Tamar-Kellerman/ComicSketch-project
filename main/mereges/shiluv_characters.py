# מודול מיזוג — מחבר את תוצאות GLiNER (ישויות עם ציוני ביטחון)
# עם אשכולות coreference (LingMess) לכדי מילון דמויות אחיד ומלא.
from classes.class_character import Character

# בודקת האם שני טווחים חופפים
def is_overlap(start1, end1, start2, end2):
    return start1 < end2 and start2 < end1  # חפיפה קיימת אם ההתחלה של אחד לפני הסוף של השני

# ממזגת דמויות בעלות שם זהה — שומרת את זו עם יותר אזכורים
def merge_characters_last(gliner_characters):
    to_remove = set()  # אוספים מה למחוק — לא מוחקים בזמן הלולאה
    for char in list(gliner_characters.values()):
        for else_char in list(gliner_characters.values()):
            if char.idx in to_remove or else_char.idx in to_remove:  # כבר סומן למחיקה — מדלגים
                continue
            if char.name.strip().lower() == else_char.name.strip().lower() and char.idx != else_char.idx:  # שמות זהים אך מזהים שונים
                if len(char.mentions) < len(else_char.mentions):  # בודקים איזו דמות מוזכרת יותר
                    char.mentions.extend(else_char.mentions)  # מוסיפים את האזכורים של השנייה לראשונה
                    to_remove.add(else_char.idx)
                else:
                    else_char.mentions.extend(char.mentions)  # מוסיפים את האזכורים של הראשונה לשנייה
                    to_remove.add(char.idx)
    for idx in to_remove:  # מוחקים רק אחרי שהלולאה סיימה
        gliner_characters.pop(idx, None)
    return gliner_characters

import requests

# ממזגת אשכולות coref עם ישויות GLiNER — לכל אשכול מחפשים דמות GLiNER שחופפת
# ובוחרים את זו עם הציון הגבוה ביותר כנציגה; שאר המועמדים נמחקים.
def merge_characters(coref_clusters, gliner_characters):
    for cluster in coref_clusters:  # עוברים על כל אשכול coref
        char_muamdim_for_cluster = []  # מועמדי GLiNER שחופפים לאשכול הנוכחי
        for mention in cluster[1]:  # עוברים על כל אזכור באשכול
            for key, char in gliner_characters.items():  # בודקים חפיפה עם כל דמות GLiNER
                if is_overlap(mention.start, mention.end, char.mentions[0].start, char.mentions[0].end):  # יש חפיפה
                    char_muamdim_for_cluster.append(key)  # מוסיפים את המפתח לרשימת המועמדים
                    if mention.end - mention.start < char.mentions[0].end - char.mentions[0].start:  # האזכור קצר מהישות ב-GLiNER
                        mention = char.mentions[0]  # מעדיפים את הניסוח הארוך יותר
        if char_muamdim_for_cluster:  # אם נמצאו מועמדים לאשכול זה
            best_char = 0
            max_score = 0
            for char_key in char_muamdim_for_cluster:  # מחפשים את הדמות עם הציון הגבוה ביותר
                if gliner_characters[char_key].score > max_score:
                    max_score = gliner_characters[char_key].score  # מעדכנים את הציון המקסימלי
                    best_char = char_key  # מעדכנים את המועמד המוביל
            if best_char:
                gliner_characters[best_char].mentions.extend(cluster[1])  # מוסיפים את כל אזכורי האשכול לדמות הנבחרת
                for char_key in char_muamdim_for_cluster:  # מוחקים את שאר המועמדים שנבלעו
                    if char_key != best_char:
                        gliner_characters.pop(char_key, None)
    gliner_characters = merge_characters_last(gliner_characters)  # מיזוג סופי לפי שמות זהים
    return gliner_characters
