import requests
from constants import get_generate_description_url

# שולחת את כל תיאורי כל דמות לשרת ה-LLM ומקבלת תיאור אחד מרוכב ונקי.
# מקבלת dict או list של Character — מחזירה אותו מבנה עם final_description מלא.
def clean_character_descriptions(characters):
    if isinstance(characters, dict):
        characters_list = characters.values()  # תמיכה בשני פורמטים
    else:
        characters_list = characters

    for character in characters_list:
        # אוספים רק תיאורים עם תוכן ממשי
        descriptions_text = [
            desc.text
            for desc in character.description
            if desc.text and desc.text.strip()
        ]

        if not descriptions_text:  # אין תיאורים — מדלגים
            character.final_description = ""
            continue

        description = ", ".join(descriptions_text)  # מחברים לרשימה שטוחה לפני שליחה

        response = requests.post(
            get_generate_description_url(),
            json={
                "name": character.name,
                "label": character.label,
                "details": description  # כל התיאורים הגולמיים — ה-LLM ישלב אותם
            }
        )

        character.final_description = response.json()["description"]

    return characters