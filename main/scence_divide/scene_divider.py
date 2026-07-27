import re          # ספריית ביטויים רגולריים — לזיהוי תבניות זמן בטקסט
import requests    # שליחת בקשות HTTP — לתקשורת עם שרת CrossEncoder
import spacy       # ספריית NLP — לחלוקה למשפטים, dependency parsing וזיהוי ישויות
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from classes.class_sentence import Sentence
from classes.class_scene import Scene
from classes.class_location import Location
from classes.class_mention import Mention
from constants import (
    get_spacy_model,              # שם מודל spaCy הקטן (en_core_web_sm) — לתחביר ולחלוקה למשפטים
    get_transition_prepositions,  # מילות יחס של תנועה (to/into/through...) — מ-constants.json
    get_scene_continuity_url,     # כתובת שרת CrossEncoder לבדיקת המשכיות סצנה
    get_scene_divide_min_score,   # מחליט לאיזו קטגוריה שייך המיקום
    get_min_sentences,            # מספר משפטים מינימלי לסצנה — מתחתיו נשקול מיזוג
    get_context_size,             # כמה משפטים אחרונים לשלוח כהקשר ל-CrossEncoder
    get_cross_scene_threshold,    # סף ה-score של CrossEncoder — מתחתיו מפצלים סצנה
    get_max_tokens,               # מספר מילים מקסימלי לחלק — מחושב כ-512/1.3 טוקנים בממוצע למילה
    get_gliner_time_labels,       # תוויות GLiNER לזמנים — גיבוי לspaCy
    get_gliner_location_labels,   # תוויות GLiNER למיקומים
)

# טעינת מודל spaCy קטן — משמש לחלוקה למשפטים ול-dependency parsing (מהיר)
nlp = spacy.load(get_spacy_model())
# טעינת מודל spaCy מבוסס transformer — משמש לזיהוי ישויות זמן בדיוק גבוה
nlp_trf = spacy.load("en_core_web_trf")


# מילות יחס סטטיות — מעידות על מיקום/ישיבה, לא על תנועה ("sat on a stump", "fell between rocks")
# מניעות זיהוי שגוי של TRANSITION_LOCATION
STATIC_PREPOSITIONS = {"on", "between", "beneath", "under", "above", "behind", "near", "beside", "among", "upon"}

# ביטוי רגולרי לקפיצה גדולה בזמן יחסי— מעיד על סצנה חדשה
# דוגמאות: "the next day", "that morning", "two weeks later"
RELATIVE_LARGE = re.compile(
    r"\b(\w+ (days?|weeks?|months?|years?|decades?|centuries?) (later|earlier|before|after|prior))"
    r"|(the (following|next|previous) (day|week|month|year|winter|summer|spring|autumn|morning|evening|night))"
    r"|(that (same )?(morning|evening|night|winter|summer|spring|autumn|day|week|month|year))",
    re.IGNORECASE,
)

# ביטוי רגולרי לקפיצת קטנה בזמן יחסי— לא מעיד על סצנה חדשה
# דוגמאות: "moments later", "suddenly", "shortly after"
RELATIVE_SMALL = re.compile(
    r"\b(moments?|seconds?|minutes?|an hour|hours?) (later|after|before|earlier)\b"
    r"|\bsuddenly\b|\bshortly (after|before)\b",
    re.IGNORECASE,
)

# ביטוי רגולרי למשך זמן ללא עגן — לא מעיד על סצנה חדשה
# דוגמאות: "thirty years", "two weeks", "a few days"
# לא כולל "one" כי "one day" הוא לרוב מחוון נרטיבי ("one day he left...")
DURATION_ONLY = re.compile(
    r"^(a |an |\d+\s+|two |three |four |five |six |seven |eight |nine |ten |"
    r"eleven |twelve |thirteen |fourteen |fifteen |twenty |thirty |forty |fifty |"
    r"hundred |a few |several |many |some )+"
    r"(years?|months?|weeks?|days?|hours?|minutes?|seconds?)$",
    re.IGNORECASE,
)


# =========================
# זיהוי זמנים
# =========================

def classify_time(text):
    """מסווגת ביטוי זמן לאחת משלוש קטגוריות לפי regex."""
    t = text.lower().strip()         # ממירה לאותיות קטנות ומסירה רווחים קיצוניים
    if RELATIVE_SMALL.search(t):     # בודקת אם זה קפיצת זמן קטנה ("moments later")
        return "RELATIVE_SMALL"      # לא יגרום לפיצול סצנה
    if RELATIVE_LARGE.search(t):     # בודקת אם זה קפיצת זמן גדולה ("the next morning")
        return "RELATIVE_LARGE"      # יגרום לפיצול סצנה
    if DURATION_ONLY.match(t):       # בודקת אם זה משך זמן בלי עגן ("thirty years")
        return "RELATIVE_SMALL"      # לא יגרום לפיצול סצנה
    return "ABSOLUTE"                # כל דבר אחר נחשב תאריך/זמן מוחלט — יגרום לפיצול


def extract_spacy_time_entities(sentences_data):
    """
    מריצה nlp_trf על הטקסט בחלקים לפי גבולות משפטים (לא חותכת משפט באמצע).
    כל חלק מכיל כמה משפטים רצופים שסכום הטוקנים שלהם לא עולה על 512.
    מחזירה dict: sent_index -> רשימת ביטויי זמן שנמצאו באותו משפט.
    """
    result = {i: [] for i in range(len(sentences_data))}  # מפה ריקה לכל משפט

    chunk_sents = []       # המשפטים שנאספו לחלק הנוכחי
    chunk_token_count = 0  # ספירת טוקנים לחלק הנוכחי

    def process_chunk(sents_in_chunk):
        """מעבדת חלק אחד של משפטים עם nlp_trf ומייחסת ישויות זמן למשפטים."""
        if not sents_in_chunk:   # אם החלק ריק — אין מה לעבד
            return
        chunk_text = ""          # הטקסט המחובר של החלק
        sent_offsets = []        # רשימה של (תחילת משפט בchunk, סוף משפט בchunk, אינדקס משפט)
        for s in sents_in_chunk:
            start_in_chunk = len(chunk_text)              # מיקום תחילת המשפט בתוך chunk_text
            chunk_text += s.text + " "                    # מוסיפה את טקסט המשפט + רווח מפריד
            sent_offsets.append((start_in_chunk, len(chunk_text), s.idx))  # שומרת את הגבולות

        doc = nlp_trf(chunk_text)   # מריצה את מודל ה-transformer על הchunk כולו

        for ent in doc.ents:                                   # עוברת על כל ישות שזוהתה
            if ent.label_ in ("DATE", "TIME"):             # מסננת — רק ישויות תאריך/זמן
                t_type = classify_time(ent.text)           # מסווגת את ביטוי הזמן
                if t_type in ("ABSOLUTE", "RELATIVE_LARGE"):   # רק ביטויים שמפצלים סצנה
                    for offset in sent_offsets: # מחפשת את המשפט שמכיל את הישות
                        if offset[0] <= ent.start_char < offset[1]:  # בודקת גבולות המשפט
                            result[offset[2]].append(ent.text) # אם נמצא משפט מתאים מוסיפה לרשימת הזמנים של המשפט

    for sent in sentences_data:                                      # עוברת על כל המשפטים
        token_count = len(sent.text.split())                         # מעריכה מספר טוקנים לפי מילים
        if chunk_sents and chunk_token_count + token_count > get_max_tokens():  # אם הוספת המשפט תחצה 394
            process_chunk(chunk_sents)   # שולחת את החלק הנוכחי לעיבוד
            chunk_sents = []             # מאפסת את החלק
            chunk_token_count = 0        # מאפסת את הספירה
        chunk_sents.append(sent)         # מוסיפה את המשפט לחלק הנוכחי
        chunk_token_count += token_count # מעדכנת את ספירת הטוקנים

    process_chunk(chunk_sents)   # מעבדת את החלק האחרון שנשאר
    return result                # מחזירה את המפה: sent_index -> [ביטויי זמן]


def get_gliner_times(gliner_output, sent_start, sent_end):
    """אם spacy לא מצא זמנים במשפט מסוים בודקים אם גלינר מצא ישויות זמן שנמצאת בטווח האידקסים של המשפט הזה"""
    times = []
    for entity in gliner_output:                                             # עוברת על כל ישות שGLiNER מצא
        label = str(entity.get("label", "")).lower()                         # שם התווית באותיות קטנות
        start = entity.get("start")                                          # מיקום תחילת הישות בטקסט המקורי
        if label in get_gliner_time_labels():                                      # רק תוויות זמן
            if start is not None and sent_start <= start < sent_end:         # בודקת שהישות שייכת למשפט הזה
                text = entity.get("text", "")                                # הטקסט של ביטוי הזמן
                if classify_time(text) in ("ABSOLUTE", "RELATIVE_LARGE"):    # רק ביטויים שמפצלים סצנה
                    times.append(text)
    return times


# =========================
# זיהוי מיקומים
# =========================

def is_location_label(label):
    """בודקת אם תווית GLiNER שייכת לקטגוריית מיקום."""
    return str(label).lower() in get_gliner_location_labels()  # השוואה לרשימת התוויות המוגדרת

# =========================
# איסוף מידע תחבירי
# =========================

def find_place_span(doc, place_text, local_start=None, local_end=None):
    """מוצאת את ה-span של ביטוי המיקום בתוך ה-doc של spacy."""
    if local_start is not None and local_end is not None:               # אם יש מיקום מדויק
        span = doc.char_span(local_start, local_end, alignment_mode="expand")  # מנסה למצוא לפי תווים
        if span is not None:                        # אובייקט של ספייסי של המיקום שנמצא
            return span
    #במקרה שיש חוסר התאמה בין התווים של spacy לבין התוים של gliner בגלל החלוקה לטוקנים
    place_words = place_text.lower().split()        # מפצלת את שם המיקום למילים
    for i in range(len(doc) - len(place_words) + 1):  #עוברת על כל הטוקנים ב- doc
        if [t.text.lower() for t in doc[i:i + len(place_words)]] == place_words:  # יש התאמה
            return doc[i:i + len(place_words)]      # אובייקט של ספייסי של המיקום שנמצא
    return None                                     # למקרה שלא נמצא (לא אמור לקרות)

def find_related_verb(token):
    """עולה בעץ התחביר מה-token עד שמוצאת פועל — הפועל שקשור למיקום."""
    current = token                                 # מתחילה מה-token עצמו
    while current.head != current:                  # כל עוד לא הגענו לשורש
        current = current.head                      # עולה רמה אחת בעץ
        if current.pos_ in {"VERB", "AUX"}:         # אם מצאנו פועל או פועל עזר
            return current                          # מחזירה אותו
    return None                                     # לא נמצא פועל

def get_preposition_of_place(place_head):
    """מוצאת את מילת היחס (in/to/through...) שלפני המיקום."""
    if place_head.dep_ in {"pobj", "pcomp"} and place_head.head.pos_ == "ADP":  # אם המיקום הוא מושא של מילת יחס
        return place_head.head     # מחזירה את מילת היחס עצמה
    if place_head.head.pos_ == "ADP":   # בדיקה נוספת — head הוא מילת יחס
        return place_head.head
    return None                         # אין מילת יחס

def is_inside_quotes_by_offsets(sentence_text, start_idx, end_idx):
    """בודקת אם טווח תווים נמצא בתוך גרשיים — מעיד שמדובר בשיחה."""
    quote_chars = {'"', "'", "“", "”", "‘", "’"}  # כל סוגי הגרשיים
    before = sentence_text[:start_idx]              # הטקסט לפני הישות
    after = sentence_text[end_idx:]                 # הטקסט אחרי הישות
    quotes_before = sum(1 for ch in before if ch in quote_chars)  # ספירת גרשיים לפני
    quotes_after = sum(1 for ch in after if ch in quote_chars)    # ספירת גרשיים אחרי
    return quotes_before % 2 == 1 and quotes_after > 0  # אי-זוגי לפני + יש אחרי = בתוך גרשיים

def is_place_after_speech_colon(sentence_text, local_start):
    """בודקת אם המיקום מופיע אחרי נקודתיים בדיבור."""
    if local_start is None:                         # ליתר ביטחון אם אין מיקום
        return False
    colon_index = sentence_text.find(":")           # מחפשת נקודתיים במשפט
    if colon_index == -1:                           # אין נקודתיים
        return False
    return local_start > colon_index                # אם המיקום אחרי הנקודתיים יחזיר TRUE אחרת FALSE

def get_location_syntax_info(sentence_text, place_text, local_start=None, local_end=None):
    """אוספת את כל המידע התחבירי על המיקום ל dict אחד — מה שישמש לסיווג תפקידו."""
    doc = nlp(sentence_text)                        # מנתחת את המשפט עם spaCy
    place_span = find_place_span(doc, place_text, local_start, local_end)  # מאתרת את המיקום
    if place_span is None:                          # לא נמצא
        return None
    place_head = place_span.root                    # ה-token הראשי של ביטוי המיקום
    related_verb = find_related_verb(place_head)    # הפועל שקשור למיקום
    prep = get_preposition_of_place(place_head)     # מילת היחס לפני המיקום
    inside_quotes = False
    if local_start is not None and local_end is not None:   # אם יש מיקום — בודקת גרשיים
        inside_quotes = is_inside_quotes_by_offsets(sentence_text, local_start, local_end)
    return {
        "doc": doc,                                                    # ה-doc המנותח
        "place_span": place_span,                                      # ה-span של המיקום
        "place_head": place_head,                                      # ה-token הראשי
        "place_dep": place_head.dep_,                                  # תפקיד תחבירי (nsubj/pobj...)
        "place_head_word": place_head.head.text,                       # המילה שבה המיקום תלוי
        "place_head_pos": place_head.head.pos_,                        # חלק הדיבר של head
        "related_verb": related_verb,                                  # אובייקט הפועל הקשור
        "related_verb_text": related_verb.text if related_verb else None,         # טקסט הפועל
        "related_verb_lemma": related_verb.lemma_.lower() if related_verb else None,  # שורש הפועל
        "related_verb_dep": related_verb.dep_ if related_verb else None,          # תפקיד הפועל
        "prep": prep,                                                  # אובייקט מילת היחס
        "prep_text": prep.text.lower() if prep else None,             # טקסט מילת היחס
        "inside_quotes": inside_quotes,                                # האם בתוך גרשיים
        "after_speech_colon": is_place_after_speech_colon(sentence_text, local_start),  # אחרי נקודתיים
    }
#local_start מיקום תחילת הישות במשפט ולא בטקסט המקורי

# =========================
# בדיקות סיווג
# =========================

# פעלי תנועה — רק אם הפועל הקשור הוא מתוך רשימה זו, נסווג מיקום כ-TRANSITION
MOVEMENT_VERBS = {
    "walk", "run", "go", "come", "move", "travel", "drive", "ride", "fly",
    "arrive", "reach", "enter", "leave", "depart", "return", "head", "pass",
    "cross", "climb", "descend", "approach", "escape", "flee", "rush", "hurry",
    "march", "wander", "roam", "sneak", "creep", "stride", "step", "jump",
}


def in_planing_in_future(related_verb):
    """מקבלת פועל ובודאת אם הוא פועל תכנון לעתיד"""
    if related_verb is None:              # אם אין פועל
        return False
    for child in related_verb.children:  # עוברת על ילדי הפועל
        if child.lower_ == "to" and child.dep_ in {"aux", "mark"}:  # יש "to"
            return True                  # זה פעולת תכנון לעתיד
    if related_verb.dep_ in {"xcomp", "ccomp"}:  # פסוקית משלימה — גם מעידה על תכנון
        return True
    return False

def is_place_in_instruction_or_planned_action(sentence_text, place_text, local_start=None, local_end=None):
    """בודקת אם המיקום מופיע בהקשר של דיאלוג, תכנון, או ציטוט — אז הוא לא מיקום של סצנה."""
    syntax_info = get_location_syntax_info(sentence_text, place_text, local_start, local_end)
    if syntax_info is None:                              # אם לא נמצא
        return False
    if syntax_info["inside_quotes"]:                     # בתוך גרשיים
        return True
    if syntax_info["after_speech_colon"]:                # אחרי נקודתיים
        return True
    if in_planing_in_future(syntax_info["related_verb"]):  # פועל תכנון עתידי
        return True
    return False

def is_location_in_temporal_clause(syntax_info):
    """בודקת אם המיקום מופיע במשפט זמני — 'when he arrived at the cave' = REAL_LOCATION."""
    place_dep = syntax_info.get("place_dep")
    related_verb = syntax_info.get("related_verb")
    if syntax_info.get("inside_quotes") or syntax_info.get("after_speech_colon"):  # בתוך דיבור
        return False
    if related_verb is None:                                   # אין פועל
        return False
    if place_dep not in {"dobj", "obj", "pobj", "pcomp"}:     # המיקום לא מושא
        return False
    for child in related_verb.children:  # חיפוש מילת זמן בילדי הפועל הישיר
        if child.lower_ in {"while", "when", "after", "before", "as"}:
            return True
    current = related_verb  # עולה בעץ לחפש מילת זמן ברמה גבוהה יותר
    while current.head != current:
        current = current.head
        for child in current.children:
            if child.lower_ in {"while", "when", "after", "before", "as"}:
                return True
    return False

def is_real_location_by_in_preposition(syntax_info):
    """בודקת אם יש מילת יחס 'in' — 'sat in the grove' → המקום הוא הסביבה הנוכחית."""
    if syntax_info.get("inside_quotes") or syntax_info.get("after_speech_colon"):  # בתוך דיבור — לא רלוונטי
        return False
    return syntax_info.get("prep_text") == "in" and syntax_info.get("place_dep") in {"pobj", "pcomp"} # אם מילת היחס היא "in" והמיקום הוא מושא

def has_transition_preposition(syntax_info):
    """בודקת אם יש מילת יחס תנועה (to/into/through...) + פועל תנועה — מעיד על TRANSITION."""
    prep_text = syntax_info.get("prep_text")
    if prep_text is None:                                    # אין מילת יחס
        return False
    if prep_text not in get_transition_prepositions():       # התנועה לא מילת יחס
        return False
    verb_lemma = syntax_info.get("related_verb_lemma")
    if verb_lemma and verb_lemma not in MOVEMENT_VERBS:      # הפועל לא פועל תנועה
        return False
    return True                                              # יש מילת יחס תנועה + פועל תנועה

def is_probable_transition_by_syntax(syntax_info):
    """בודקת אם המיקום הוא TRANSITION — מיקום שאליו הדמות נעה."""
    if syntax_info.get("inside_quotes") or syntax_info.get("after_speech_colon"):  # דיבור
        return False
    if syntax_info.get("related_verb") is None:              # אין פועל
        return False
    if syntax_info.get("prep_text") in STATIC_PREPOSITIONS:  # מילת יחס סטטית (on/between) — לא תנועה
        return False
    if syntax_info.get("related_verb_lemma") not in MOVEMENT_VERBS:  # הפועל לא פועל תנועה
        return False
    return syntax_info.get("place_dep") in {"pobj", "pcomp"}  # המיקום הוא מושא של הפועל


# =========================
# הכנה ל- CrossEncoder
# =========================

def build_location_context_for_model(sentence_text, place_text, local_start=None, local_end=None):
    """בונה טקסט מובנה עם מידע תחבירי — יישלח ל-CrossEncoder לסיווג תפקיד המיקום."""
    info = get_location_syntax_info(sentence_text, place_text, local_start, local_end)
    if info is None:       # לא ניתן לנתח — אין מה לשלוח
        return None
    # מחזירה מחרוזת מובנית המתארת את ההקשר התחבירי של המיקום
    return f"""Sentence: {sentence_text}
Place: {place_text}

Syntactic information:
- Place dependency: {info["place_dep"]}
- Place root token: {info["place_head"].text}
- Place head word: {info["place_head_word"]}
- Place head part of speech: {info["place_head_pos"]}
- Related verb: {info["related_verb_text"] or "None"}
- Related verb lemma: {info["related_verb_lemma"] or "None"}
- Related verb dependency: {info["related_verb_dep"] or "None"}
- Related preposition: {info["prep_text"] or "None"}
- Is the place inside quoted speech: {"yes" if info["inside_quotes"] else "no"}
- Is the place after a speech colon: {"yes" if info["after_speech_colon"] else "no"}""".strip()


# =========================
# CrossEncoder
# =========================

def ask_crossencoder_score(text1, text2, title="CROSSENCODER"):
    """שולחת שני טקסטים לשרת CrossEncoder ומקבלת ציון דמיון/התאמה."""
    try:
        response = requests.post(
            get_scene_continuity_url(),     # כתובת השרת
            json={"text1": text1, "text2": text2},  # הטקסטים לבדיקה
            timeout=10,                      # מגבלת זמן המתנה בשניות
        )
        response.raise_for_status()          # זורקת שגיאה אם קוד HTTP אינו 2xx
        return response.json()["score"]      # קוראת את הציון מהתשובה
    except Exception:                        # כל שגיאת רשת/פענוח
        return None                          # מחזירה None — הקוד הקורא יטפל בכך


# =========================
# סיווג תפקיד מקום
# =========================

def classify_location_role(sentence_text, place_text, local_start=None, local_end=None,
                           min_score=None):
    """
    מסווגת את תפקיד המיקום לאחת מארבע קטגוריות:
    REAL_LOCATION / TRANSITION_LOCATION / PLANNED_DESTINATION / MENTIONED_LOCATION / UNKNOWN

    קודם מנסה כללים תחביריים מהירים, ורק אם לא הצליחה — שולחת ל-CrossEncoder.
    """
    if min_score is None:
        min_score = get_scene_divide_min_score()

    syntax_info = get_location_syntax_info(sentence_text, place_text, local_start, local_end)
    if syntax_info is None:                                   # spaCy לא מצא את המיקום
        return "UNKNOWN"

    # כלל 1: מיקום בתוך גרשיים, אחרי נקודתיים, או בפסוקית עתידית → יעד מתוכנן
    if is_place_in_instruction_or_planned_action(sentence_text, place_text, local_start, local_end):
        return "PLANNED_DESTINATION"

    # כלל 2: המיקום הוא subject של פועל "be" לדוגמא: "The forest was quiet" = מיקום נוכחי
    if syntax_info["place_dep"] == "nsubj" and syntax_info["related_verb_lemma"] == "be":
        return "REAL_LOCATION"

    # כלל 3: המיקום הוא חלק של subject לדוגמא: "The grove entrance whispered" = מיקום נוכחי
    if syntax_info["place_dep"] == "compound":
        head_token = syntax_info["place_head"].head      # ה-token שהמיקום מרכיב אותו
        if head_token.dep_ in {"nsubj", "nsubjpass"}:   # ה-compound head הוא subject
            return "REAL_LOCATION"

    # כלל 4: מילת יחס "in" לדוגמא: "sat in the grove" = מיקום נוכחי
    if is_real_location_by_in_preposition(syntax_info):
        return "REAL_LOCATION"

    # כלל 5: משפט שקורה בזמן ההתרחשות לדוגמא: "when he arrived at the cave" = מיקום נוכחי
    if is_location_in_temporal_clause(syntax_info):
        return "REAL_LOCATION"

    # כלל 6: מילת יחס תנועה + פועל תנועה → TRANSITION
    if has_transition_preposition(syntax_info):
        return "TRANSITION_LOCATION"

    # כלל 7: מושא (pobj) של פועל תנועה = TRANSITION
    if is_probable_transition_by_syntax(syntax_info):
        return "TRANSITION_LOCATION"

    # שום כלל לא תפס — שולחים ל-CrossEncoder עם הסבר תחבירי
    context = build_location_context_for_model(sentence_text, place_text, local_start, local_end)
    if context is None:     # לא ניתן לבנות הקשר
        return "UNKNOWN"

    # הגדרות טקסטואליות לכל קטגוריה — ישלחו ל-CrossEncoder להשוואה
    role_definitions = {
        "REAL_LOCATION": (
            "The place is the actual physical setting where the characters are currently present "
            "and where the action of the sentence happens."
        ),
        "TRANSITION_LOCATION": (
            "The sentence describes actual movement, travel, arrival, departure, entering, leaving, "
            "or passing through this place as part of a real transition between scenes."
        ),
        "PLANNED_DESTINATION": (
            "The place is a destination mentioned as a plan, instruction, goal, route, or future action. "
            "The characters are not physically there yet in this sentence."
        ),
        "MENTIONED_LOCATION": (
            "The place is only mentioned in speech, thought, memory, imagination, explanation, "
            "background information, or description. The characters are not physically acting there now."
        ),
    }

    scores = {}
    for role, definition in role_definitions.items():   # שולח בקשה נפרדת לכל קטגוריה
        score = ask_crossencoder_score(context, definition, title=f"LOCATION ROLE - {role}")
        if score is not None:       # אם קיבלנו ציון תקין
            scores[role] = score    # שומרים את הציון

    if not scores:          # אם כל הבקשות נכשלו
        return "UNKNOWN"

    best_role = max(scores, key=scores.get)      # הקטגוריה עם הציון הגבוה ביותר
    best_score = scores[best_role]               # הציון הגבוה ביותר
    second_best = sorted(scores.values(), reverse=True)[1] if len(scores) > 1 else 0

    # אם הציון נמוך מסף, או שאין הבדל מספיק בין שתי הקטגוריות הטובות → חוסר ביטחון
    if best_score < min_score or (best_score - second_best) < 0.05:
        return "UNKNOWN"

    return best_role    # מחזירה את הקטגוריה עם הביטחון הגבוה ביותר


# =========================
# פונקציות עזר לסצנות
# =========================

def get_location_keywords(loc_text):
    """מחלצת מילות מפתח (שמות עצם) מביטוי מיקום — לצורך השוואת מיקומים."""
    doc = nlp(loc_text)
    return {token.lemma_.lower() for token in doc if token.pos_ in {"NOUN", "PROPN"}}  # שמות עצם בלבד


def locations_share_context(loc1, loc2):
    """בודקת אם שני ביטויי מיקום חולקים מילות מפתח — למניעת פיצול על אותו מיקום."""
    return bool(get_location_keywords(loc1) & get_location_keywords(loc2))  # חיתוך קבוצות


def is_sublocation_of_current(new_place, current_scene_places):
    """בודקת אם המיקום החדש הוא וריאציה של מיקום קיים בסצנה — למניעת פיצול מיותר."""
    return any(locations_share_context(new_place, p) for p in current_scene_places)


def get_places_that_can_split(sentence):
    """מחזירה רק מיקומים שיכולים לגרום לפיצול סצנה — REAL ו-TRANSITION בלבד."""
    return [
        place.name
        for place in sentence.places
        if place.role in {"REAL_LOCATION", "TRANSITION_LOCATION"}  # PLANNED ו-MENTIONED לא מפצלים
    ]


# =========================
# שילוב coreference עם מיקומים
# =========================

# כינויי גוף שיש לסנן מ-coref — הם לא מתארים מיקום
PRONOUN_TEXTS = {
    "he", "she", "it", "they", "his", "her", "its", "their",
    "him", "them", "i", "we", "you", "my", "your", "our",
    "me", "us", "this", "that", "these", "those",
}

def build_coref_location_map(gliner_output, coref_output):
    """
    בונה מפה: mention_start -> (mention_end, location_text)

    הלוגיקה:
    1. אוספת שמות מיקומים מ-GLiNER
    2. עוברת על clusters של coreference
    3. אם שם האשכול תואם מיקום מ-GLiNER → כל ה-mentions באשכול (שאינם כינויי גוף) ממופים למיקום
    מטרה: לזהות אזכורים כמו "the cave" / "Echo Cave" שמתייחסים לאותו מקום
    """
    location_texts = set()              # אוסף שמות המיקומים ש GLiNER זיהה
    for entity in gliner_output:
        if is_location_label(str(entity.get("label", "")).lower().strip()):  # רק מיקומים
            text = entity.get("text")
            if text:
                location_texts.add(text.lower().strip())   # מוסיפה לאוסף באותיות קטנות

    coref_map = {}
    for cluster_texts, mentions_list in coref_output:    # עוברת על כל אשכול
        cluster_name = cluster_texts.lower().strip() if isinstance(cluster_texts, str) else None
        if cluster_name in location_texts:              # שם האשכול הוא מיקום מ-GLiNER
            for mention in mentions_list:                    # עוברת על כל אזכור באשכול
                mention_text = mention.text.strip() if hasattr(mention, "text") else ""
                if mention_text.lower() not in PRONOUN_TEXTS:    # לא כינוי גוף
                    coref_map[mention.start] = (mention.end, cluster_texts)  # שומרת במפה

    return coref_map


# =========================
# חלוקה למשפטים
# =========================

def split_text_to_sentences(text):
    """מחלקת את הטקסט למשפטים עם spaCy, מחזירה רשימת Sentence."""
    doc = nlp(text)
    return [
        Sentence(
            idx=i,
            start=sent.start_char,
            end=sent.end_char,
            text=sent.text.strip(),
            spacy_sent=sent,
        )
        for i, sent in enumerate(s for s in doc.sents if s.text.strip())  # מדלגת על משפטים ריקים
    ]


# =========================
# עיבוד סופי
# =========================

def merge_short_scenes(scenes, min_sentences=None):
    """מוזגת סצנות קצרות מדי לסצנה הקודמת — אלא אם נפתחו על ידי ביטוי זמן."""
    if min_sentences is None:
        min_sentences = get_min_sentences()

    if not scenes:          # אין סצנות — מחזירה ריק
        return scenes
    merged = [scenes[0]]    # הסצנה הראשונה תמיד נשמרת
    for scene in scenes[1:]:
        # מוזגת רק אם: קצרה מדי AND לא נפתחה על ידי זמן (סצנות זמן נשמרות גם אם קצרות)
        if scene.sentence_count < min_sentences and scene.split_reason != ["time"]:
            prev = merged[-1]   # הסצנה הקודמת שתקלוט אותה
            prev.text = prev.text.rstrip() + " " + scene.text   # מחבר הטקסטים
            prev.sentence_count += scene.sentence_count          # מעדכן את מספר המשפטים
            for loc in scene.location:    # מוסיף מיקומים ייחודיים
                if loc != "Unknown/Continued" and loc not in prev.location:
                    prev.location.append(loc)
            for t in scene.time:          # מוסיף זמנים ייחודיים
                if t != "Unknown/Continued" and t not in prev.time:
                    prev.time.append(t)
        else:
            merged.append(scene)    # סצנה תקינה — נשמרת בנפרד
    return merged


def inherit_locations(scenes):
    """
    מעביר מיקום מסצנה לסצנה הבאה אם אין מידע חדש.
    חריג: סצנות שנפתחו על ידי זמן בלבד — לא יורשות מיקום (כי לא ידוע איפה הדמות).
    """
    for i in range(1, len(scenes)):
        if scenes[i].location == ["Unknown/Continued"]:  # אין מיקום — בודקת אם לרשת
            if scenes[i].split_reason != ["time"]:        # לא נפתחה על ידי זמן — יורשת
                scenes[i].location = scenes[i - 1].location
    return scenes


def inherit_times(scenes):
    """מעביר זמן מסצנה לסצנה הבאה אם אין מידע חדש — אופציונלי לפי הגדרות."""
    for i in range(1, len(scenes)):
        if scenes[i].time == ["Unknown/Continued"]:       # אין זמן — יורשת
            scenes[i].time = scenes[i - 1].time
    return scenes


# =========================
# הפונקציה הראשית
# =========================

def split_story_to_scenes(
    text,                                    # הטקסט המלא של הסיפור
    gliner_output,                           # פלט GLiNER — רשימת ישויות עם מיקומים וזמנים
    coref_output=None,                       # פלט coreference — אשכולות אזכורים
    merge_short=True,                        # האם למזג סצנות קצרות
    inherit_time=False,                      # האם לרשת זמן מסצנה לסצנה
):
    sentences_data = split_text_to_sentences(text)  # חלוקה למשפטים עם מיקומים
    if not sentences_data:      # טקסט ריק — מחזירה ריק
        return []

    # בניית מפת coreference — מיקומים שמוזכרים בצורות שונות
    coref_map = build_coref_location_map(gliner_output, coref_output) if coref_output else {}

    # זיהוי ביטויי זמן על כל הטקסט בבת אחת — יותר מדויק מאשר משפט-משפט
    spacy_times_map = extract_spacy_time_entities(sentences_data)

    # --- שיוך ישויות למשפטים ---
    for sent_idx, sentence in enumerate(sentences_data):
        # זמנים: spaCy הוא המקור הראשי — GLiNER הוא גיבוי אם spaCy לא מצא
        spacy_times = spacy_times_map.get(sent_idx, [])  # קוראת מהמפה שנבנתה מראש
        if spacy_times:
            sentence.times = spacy_times              # spaCy מצא — משתמשת בהם
        else:
            sentence.times = get_gliner_times(gliner_output, sentence.start, sentence.end)  # גיבוי

        # מיקומים מ-GLiNER — עוברת על כל ישות ומסווגת תפקידה
        for entity in gliner_output:
            start = entity.get("start")                          # מיקום תחילת הישות
            end = entity.get("end")                              # מיקום סוף הישות
            label = str(entity.get("label", "")).lower().strip() # תווית הישות
            entity_text = entity.get("text")                     # הטקסט של הישות

            if (
                is_location_label(label)
                and start is not None
                and entity_text is not None
                and sentence.start <= start < sentence.end
            ):
                # המרת מיקום מוחלט למיקום יחסי בתוך המשפט (לצורך dependency parsing)
                local_start = start - sentence.start
                local_end = end - sentence.start if end is not None else None

                role = classify_location_role(       # סיווג תפקיד המיקום
                    sentence_text=sentence.text,
                    place_text=entity_text,
                    local_start=local_start,
                    local_end=local_end,
                )
                sentence.places.append(Location(
                    name=entity_text,
                    label=label,
                    score=entity.get("score", 0.0),
                    mentions=[Mention(start=start, end=end, text=entity_text)],
                    description=[],
                    role=role,
                ))

        # מיקומים דרך coreference — mentions שמתייחסים למיקומים שכבר זוהו
        already_covered = {p.name for p in sentence.places}   # מיקומים שכבר טופלו
        for mention_start, (mention_end, loc_text) in coref_map.items():
            if (
                sentence.start <= mention_start < sentence.end
                and loc_text not in already_covered
            ):
                local_start = mention_start - sentence.start
                clipped_end = min(mention_end, sentence.end)   # קיצוץ לגבול המשפט למניעת חריגה
                local_end = clipped_end - sentence.start
                mention_text = sentence.text[local_start:local_end]  # טקסט האזכור
                role = classify_location_role(       # מסווגת את האזכור
                    sentence_text=sentence.text,
                    place_text=mention_text,
                    local_start=local_start,
                    local_end=local_end,
                )
                sentence.places.append(Location(
                    name=loc_text,
                    label="location",
                    score=0.0,
                    mentions=[Mention(start=mention_start, end=mention_end, text=mention_text)],
                    description=[],
                    role=role,
                ))
                already_covered.add(loc_text)

    # --- בניית סצנות ---
    scenes = []
    first = sentences_data[0]                             # המשפט הראשון — מאתחל את הסצנה הראשונה
    current_places = set(get_places_that_can_split(first))  # מיקומים ידועים בסצנה הנוכחית
    current_times = set(first.times)                      # זמנים ידועים בסצנה הנוכחית
    current_sentences = [first.text]                      # טקסט הסצנה הנוכחית
    current_reason = []                                   # סיבת הפיצול (מלפניה — ריק לסצנה ראשונה)
    current_start_char = first.start                      # מיקום תחילת הסצנה הנוכחית
    current_end_char = first.end                          # מיקום סוף הסצנה הנוכחית (מתעדכן)

    for i in range(1, len(sentences_data)):               # עוברת על שאר המשפטים
        sentence = sentences_data[i]
        places_that_can_split = get_places_that_can_split(sentence)  # מיקומים שיכולים לפצל

        # בודקת אם יש מיקום חדש — שלא מופיע בסצנה הנוכחית ואינו תת-מיקום שלה
        has_new_place = any(
            p not in current_places and not is_sublocation_of_current(p, current_places)
            for p in places_that_can_split
        )
        # בודקת אם יש ביטוי זמן חדש — שלא הופיע קודם בסצנה
        has_new_time = any(t not in current_times for t in sentence.times)

        # בודקת רק אם יש סיבה פוטנציאלית לפיצול (מיקום חדש OR זמן חדש)
        should_check = (places_that_can_split and has_new_place) or (sentence.times and has_new_time)

        if should_check:
            # לוקחת את N המשפטים האחרונים כהקשר לשאילת CrossEncoder
            context_text = " ".join(current_sentences[-get_context_size():])
            # שואלת: האם המשפט הנוכחי ממשיך את ההקשר, או שמדובר בסצנה חדשה?
            score = ask_crossencoder_score(context_text, sentence.text, title="SCENE CONTINUITY")

            # אם ה-score נמוך מהסף (או נכשל) → מפצלים
            should_split = score is None or score < get_cross_scene_threshold()

            if should_split:
                split_reason = (["place"] if has_new_place else []) + (["time"] if has_new_time else [])
                # שומרת את הסצנה הנוכחית
                scenes.append(Scene(
                    location=list(current_places) if current_places else ["Unknown/Continued"],
                    time=list(current_times) if current_times else ["Unknown/Continued"],
                    characters=[],
                    text=" ".join(current_sentences),
                    split_reason=current_reason,
                    start_char=current_start_char,
                    end_char=current_end_char,
                    sentence_count=len(current_sentences),
                ))
                # מאתחלת סצנה חדשה
                current_places = set(places_that_can_split)
                current_times = set(sentence.times)
                current_sentences = [sentence.text]
                current_reason = split_reason
                current_start_char = sentence.start
                current_end_char = sentence.end
            else:
                # בדקנו אבל לא פיצלנו — מוסיפה את המשפט לסצנה הנוכחית
                if places_that_can_split:
                    current_places.update(places_that_can_split)  # מעדכנת את המיקומים הידועים
                if sentence.times:
                    current_times.update(sentence.times)           # מעדכנת את הזמנים הידועים
                current_sentences.append(sentence.text)            # מוסיפה את הטקסט
                current_end_char = sentence.end                    # מעדכנת את סוף הסצנה

        # לא בדקנו כלל (אין מיקום/זמן חדש) — מוסיפה את המשפט לסצנה הנוכחית
        else:
            if places_that_can_split:
                current_places.update(places_that_can_split)
            if sentence.times:
                current_times.update(sentence.times)
            current_sentences.append(sentence.text)
            current_end_char = sentence.end

    # סגירת הסצנה האחרונה — אחרי שסיימנו לעבור על כל המשפטים
    if current_sentences:
        scenes.append(Scene(
            location=list(current_places) if current_places else ["Unknown/Continued"],
            time=list(current_times) if current_times else ["Unknown/Continued"],
            characters=[],
            text=" ".join(current_sentences),
            split_reason=current_reason,
            start_char=current_start_char,
            end_char=current_end_char,
            sentence_count=len(current_sentences),
        ))

    if merge_short:
        scenes = merge_short_scenes(scenes)  # מוזגת סצנות קצרות מדי

    scenes = inherit_locations(scenes)       # מעביר מיקומים לסצנות ללא מיקום

    if inherit_time:
        scenes = inherit_times(scenes)       # מעביר זמנים (אם מופעל)

    return scenes   # מחזירה את רשימת הסצנות הסופית
