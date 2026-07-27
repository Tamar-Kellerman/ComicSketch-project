# מציאת מיקומים וזמנים בטקסט בעזרת gliner
from gliner import GLiNER
from constants import get_gliner_model_path, get_gliner_places_times_threshold, get_gliner_max_length, get_places_times_labels
model = GLiNER.from_pretrained(get_gliner_model_path())
from classes.class_character import Character
from classes.class_mention import Mention

# כל ישות: {"start", "end", "text", "label", "score"}
def extract_locations_and_times(text):
    entities = model.predict_entities(
        text,
        get_places_times_labels(),
        threshold=get_gliner_places_times_threshold(),
        max_length=get_gliner_max_length(),
    )
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
    return entities
