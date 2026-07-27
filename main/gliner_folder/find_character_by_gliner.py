import requests
from classes.class_character import Character
from classes.class_mention import Mention
from constants import get_extract_entities_url, get_gliner_default_threshold, get_character_labels

# שולחת את הטקסט לשרת GLiNER ומחזירה מילון דמויות — שמות, קטגוריות וציוני ביטחון
def extract_characters(text):
    url = get_extract_entities_url()
    payload = {"text": text, "labels": get_character_labels(), "threshold": get_gliner_default_threshold()}
    response = requests.post(url, json=payload)  # קריאה לשרת
    entities = response.json()["entities"]       # רשימת הישויות שהוחזרו מהשרת
    characters = {}
    for entity in entities:
        character = Character(
            name=entity["text"], 
            label=entity["label"], 
            score=entity["score"], 
            mentions=[Mention(start=entity["start"], end=entity["end"], text=entity["text"])], 
            description=[]
        )
        characters[Character.convert(entity["text"]) + entity["start"] + entity["end"]] = character  # מזהה ייחודי כמפתח
    return characters