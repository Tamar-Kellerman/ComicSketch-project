# שרת Flask שמקבל טקסט ומחזיר מילון דמויות מעובד — מיועד לתקשורת עם צד לקוח (C# / React)
from flask import Flask, request, jsonify
from flask_cors import CORS
from classes.class_character import Character
from gliner_folder.split_by_lable import split_entities_by_lable
from discriptions.characters_descriptions import extract_all_descriptions
from discriptions.locations_descriptions import extract_all_descriptions as extract_location_descriptions
from coref.lingmessCoref import extract_characters_with_mentions
from gliner_folder.find_character_by_gliner import extract_characters
from mereges.shiluv_characters import merge_characters
from mereges.shiluv_locations import build_location_objects, merge_locations
from discriptions.final_descriptions import clean_character_descriptions
from scence_divide.scene_divider import split_story_to_scenes
from scence_divide.characters_to_scene import get_characters_per_scene
from gliner_folder.find_places_times_by_gliner import extract_locations_and_times
import spacy
from concurrent.futures import ThreadPoolExecutor

SPACY_MODEL_NAME = "en_core_web_sm"
GLINER_LOCATION_LABELS = [
    "man-made structure",
    "geographical feature",
    "country, city or region"
]
MERGE_SHORT = True
INHERIT_TIME = False

nlp = spacy.load(SPACY_MODEL_NAME, disable=["ner"])  # טוענים spacy ללא NER — GLiNER מטפל בזיהוי ישויות
app = Flask(__name__)  # יוצרים את אפליקציית Flask
CORS(app)  # מאפשר תקשורת cross-origin — נדרש כשה-frontend רץ על פורט שונה

# מקבלת טקסט ב-POST ומחזירה JSON עם רשימת דמויות מעובדות
@app.route('/process', methods=['POST'])
def process_text():
    data = request.get_json()  # קוראים את גוף הבקשה כ-JSON

    original_text = None

    if isinstance(data, str):  # אם שלחו מחרוזת ישירה במקום אובייקט
        original_text = data

    elif isinstance(data, dict):  # אם שלחו אובייקט — ננסה מספר שמות מפתח אפשריים
        if 'text' in data:
            original_text = data['text']
        elif 'Text' in data:
            original_text = data['Text']
        elif 'storyText' in data:
            original_text = data['storyText']

    if not original_text:  # אם לא הצלחנו לחלץ טקסט — מחזירים שגיאה עם פרטי הבקשה שהתקבלה
        return jsonify({
            'error': 'Missing text parameter',
            'received_data_type': str(type(data)),
            'received_data_content': data
        }), 400
    doc = nlp(original_text)  # מנתחים את הטקסט עם spacy לקבלת מבנה תחבירי

    # שלב משותף: coreference — נחוץ לשני הצינורות
    clusters = extract_characters_with_mentions(original_text)

    # פייפליין דמויות — GLiNER → מיזוג → תיאורים → תיאור סופי
    def run_character_pipeline():
        entities = extract_characters(original_text)
        entities = merge_characters(clusters, entities)
        extract_all_descriptions(entities, doc)
        location_list, time_list, other_list = split_entities_by_lable(entities)
        return clean_character_descriptions(other_list)

    # פייפליין מיקומים — GLiNER → בניית אובייקטים → מיזוג → תיאורים → חלוקה לסצנות
    def run_location_pipeline():
        gliner_entities = extract_locations_and_times(original_text)
        locations = build_location_objects(gliner_entities, GLINER_LOCATION_LABELS)
        locations = merge_locations(clusters, locations)
        locations = extract_location_descriptions(locations, doc)
        scenes = split_story_to_scenes(text=original_text, gliner_output=gliner_entities,
                                       coref_output=clusters, merge_short=MERGE_SHORT, inherit_time=INHERIT_TIME)
        return locations, scenes

    # הרצה מקבילית של שני הצינורות
    with ThreadPoolExecutor(max_workers=2) as executor:
        char_future = executor.submit(run_character_pipeline)
        loc_future  = executor.submit(run_location_pipeline)
        characters          = char_future.result()
        locations, scenes   = loc_future.result()

    # get_characters_per_scene מצפה ל-dict — ממירים את הרשימה
    characters_dict = {char.idx: char for char in characters}
    chars_per_scene = get_characters_per_scene(scenes, characters_dict)

    characters_list = []  # רשימת הדמויות שתוחזר כ-JSON
    for char_obj in characters:  # עוברים על כל דמות במילון

        mentions_data = []  # אזכורי הדמות בפורמט JSON
        for m in char_obj.mentions:
            mentions_data.append({
                'text': m.text,   # טקסט האזכור
                'start': m.start, # מיקום התחלה
                'end': m.end      # מיקום סוף
            })

        descriptions_data = []  # תיאורי הדמות בפורמט JSON
        for d in char_obj.description:
            descriptions_data.append({
                'text': d.text,   # טקסט התיאור
                'type': d.type,   # סוג התיאור
                'start': d.start, # מיקום התחלה
                'end': d.end      # מיקום סוף
            })

        characters_list.append({
            'idx': char_obj.idx,
            'name': char_obj.name,
            'label': char_obj.label,
            'score': char_obj.score,
            'mentions': mentions_data,
            'descriptions': descriptions_data,
            'final_description': char_obj.final_description
        })
    #שלב 3: שיוך לרשימת הדמויות שבסצנה
    
    # ממירים את רשימת הסצנות לפורמט JSON
    scenes_list = []
    for i, scene in enumerate(scenes):
        scenes_list.append({
            'location': scene.location,
            'time': scene.time,
            'text': scene.text,
            'split_reason': scene.split_reason,
            'characters': chars_per_scene[i],
        })

    # print("SCENES_LIST:", scenes_list)
    # print("RETURN JSON:", {'processedText': characters_list, 'scenes': scenes_list})
    # return jsonify({'processedText': characters_list})  # מחזירים את רשימת הדמויות
    locations_list = []
    for loc in locations.values():
        descriptions_data = [
            {'text': d.text, 'type': d.type, 'start': d.start, 'end': d.end}
            for d in loc.description
        ]
        locations_list.append({
            'name': loc.name,
            'label': loc.label,
            'score': loc.score,
            'descriptions': descriptions_data,
        })

    return jsonify({'processedText': characters_list, 'scenes': scenes_list, 'locations': locations_list})

if __name__ == '__main__':
    print("שרת הפייתון עולה באוויר ומקשיב בפורט 5000...")
    app.run(port=5000, debug=True)  # מפעילים את השרת בפורט 5000
