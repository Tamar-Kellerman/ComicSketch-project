from classes.class_description import Description
from constants import (
    get_physical_nouns as _PHYSICAL_NOUNS,
    get_wearing_lemmas_main as WEARING_LEMMAS_MAIN,
    get_wearing_lemmas_acl as WEARING_LEMMAS_ACL,
    get_pronoun_texts as _PRONOUN_TEXTS,
    get_body_or_clothing_nouns as BODY_OR_CLOTHING_NOUNS,
    get_copular_verbs as COPULAR_VERBS,
    get_role_verbs as ROLE_VERBS,
)

# מסירה תיאורים כפולים מבחינת מיקום
def clean_overlapping_descriptions(characters):
    for c_id, character in characters.items():
        descriptions = character.description
        descriptions.sort(key=lambda d: d.start)
        desc_cleaned = descriptions[:1]  # (ריק אם הרשימה ריקה) התיאור הראשון
        for d in descriptions[1:]:
            last = desc_cleaned[-1]
            if not (last.start <= d.start and d.end <= last.end): # הנוכחי אינו מוכל בקודם
                if d.start <= last.start and last.end <= d.end: # הקודם מוכל בנוכחי — מחליפים ביניהם
                    desc_cleaned[-1] = d
                else:  # אין הכלה — מוסיפים
                    desc_cleaned.append(d)
        characters[c_id].description = desc_cleaned
    return characters

# מסירה תיאורים כפולים מבחינת טקסט
def clean_the_same_desc(characters):
    for character in characters.values():
        descs = character.description #עותק זמני של הרשימה
        character.description = [
            d for i, d in enumerate(descs)
            if not any(
                d.text.lower().strip() in descs[j].text.lower().strip()
                for j in range(len(descs)) if i != j
            )
        ]
    return characters

# מוסיפה תיאור בודד לרשימת התיאורים של דמות
def add_desc(characters, char_id, res):
    characters[char_id].description.append(
        Description(
            start=res["start"],  # אינדקס תחילת התיאור
            end=res["end"],      # אינדקס סוף התיאור
            text=res["text"],    # הטקסט
            type=res["type"]     # החלק התחבירי
        )
    )

# מחלצת ביטוי אפוזיציה — לדוגמה:
# "a brilliant young scientist" מ-"Emma, a brilliant young scientist"
def check_appos(chunk, doc, get_character_fast):
    if chunk.root.dep_ == "appos":  # שורש הצירוף הוא אפוזיציה
        # בדיקה 1: הטוקן הבא הוא ! — קריאה/vocative
        if chunk.end < len(doc) and doc[chunk.end].text == "!":
            return None
        # ה-chunk עצמו הוא דמות — כלומר קריאה לדמות אחרת
        if get_character_fast(chunk.start_char, chunk.end_char):
            return None
        return {
            "text": chunk.text,
            "start": chunk.start_char,
            "end": chunk.end_char,
            "type": "appos"
        }
    return None

# ביטויים אחרי "with" ו-"in" — כולל שרשרת "with X and in Y"
def check_prep_with_in(chunk, token_to_chunk):
    found = []  # רשימת התיאורים שנמצאו
    # פונקציה פנימית שמטפלת בילדי prep בודד
    def collect_from_prep(prep_token):
        for prep_child in prep_token.children:  # עוברים על ילדי ה-prep
            if prep_child.dep_ == "pobj":  # מושא המציינת
                np = token_to_chunk.get(prep_child)  # מאתרים את צירוף השם המלא
                if np:
                    found.append({
                        "text": np.text,
                        "start": np.start_char,
                        "end": np.end_char,
                        "type": "prep"
                    })
                for conj_child in prep_child.children:  # מטפלים ב-"with X and Y"
                    if conj_child.dep_ == "conj":
                        conj_np = token_to_chunk.get(conj_child)
                        if conj_np:
                            found.append({
                                "text": conj_np.text,
                                "start": conj_np.start_char,
                                "end": conj_np.end_char,
                                "type": "prep"
                            })

    for child in chunk.root.children:  # עוברים על ילדי שורש הצירוף
        #prep= תיאור באמצעות מילת יחס
        if child.dep_ == "prep" and child.text in ["with", "in"]:  # מציינת עם/ב
            collect_from_prep(child)  # מטפלים ב-with/in הראשי
            # with a red scarf and in a woolen dress
            for sub_child in child.children:  # מטפלים בשרשרת and between with/in
                #conj= איבר מחובר בקישור
                if sub_child.dep_ == "conj" and sub_child.text in ["with", "in"]:
                    collect_from_prep(sub_child)
    return found

# מחלצת תיאור קופולרי — לדוגמה: "happy" מ-"Lily is happy"
def check_copular(token):
    if token.pos_ in ["VERB", "AUX"] and token.lemma_ in COPULAR_VERBS:  # פועל קישור
        if any(c.dep_ == "neg" for c in token.children):  # שלילה — "He was not rich" → לדלג
            return None
        for child in token.children:
            #nsubj= נושא
            #nsubjpass= נושא במשפט סביל
            if child.dep_ in ["nsubj", "nsubjpass"]:
                #PROPN= שם פרטי
                #PRON= כינוי גוף
                if child.pos_ in ["PROPN", "PRON"]:
                    char_subject = child  # דמות ישירה — Gili, She
                    nsubj_noun = None
                else: #הנושא הוא שם עצם רגיל
                    # בדיקה אם יש ילד שמציין קניין שהוא כינוי גוף — "Her hands were strong"
                    poss = next((c for c in child.children if c.dep_ == "poss" and c.pos_ == "PRON"), None)
                    if poss:
                        char_subject = poss
                        #קובעת אם לשמור את שם העצם של הנושא לשימוש בעת בניית התיאור
                        nsubj_noun = None if child.text.lower() in _PHYSICAL_NOUNS else child  # "dirty clothes" — צריך לשלב שם העצם
                    else:
                        char_subject = child  # במקרה ששם העצם הרגיל זה דמות
                        nsubj_noun = None
                for desc_tok in token.children:
                    #acomp= משלים שמני של תואר
                    #attr= משלים שמני של שם עצם- תכונה או מאפיין
                    if desc_tok.dep_ in ["acomp", "attr"]:
                        #אם זה מצב רגשי חולף- מדלגים 
                        is_contextual = desc_tok.dep_ == "acomp" and any(c.dep_ == "prep" for c in desc_tok.children)
                        # גוף ראשון — "I am scared" בשיחה, זה לא תכונת אופי
                        is_first_person = desc_tok.dep_ == "acomp" and char_subject.text == "I"
                        if not is_contextual and not is_first_person:
                            subtree = list(desc_tok.subtree)  # כל הענף של המשלים
                            subtree.sort(key=lambda t: t.i)  # דואג לרצף נכון של מילים 
                            desc_text = " ".join([t.text for t in subtree])
                            # "dirty" + "clothes" = "dirty clothes" משלב יחד עם שלב קודם
                            if nsubj_noun and desc_tok.dep_ == "acomp":  
                                desc_text = f"{desc_text} {nsubj_noun.text}"
                            return {
                                "text": desc_text,
                                "start": subtree[0].idx,
                                "end": subtree[-1].idx + len(subtree[-1].text),
                                "type": "copular",
                                "subject_tok": char_subject,
                                "nsubj_tok": child if child.pos_ not in ["PROPN", "PRON"] else None
                            }
                    #JJ= תואר רגיל
                    #JJR= תאור השוואתי
                    #JJS= הכי
                    elif desc_tok.dep_ in ["advmod", "advcl"] and desc_tok.tag_ in ["JJ", "JJR", "JJS"]:  # "stood tall" — ADJ כילד של pseudo-copula
                        subtree = list(desc_tok.subtree)
                        subtree.sort(key=lambda t: t.i)
                        return {
                            "text": " ".join([t.text for t in subtree]),
                            "start": subtree[0].idx,
                            "end": subtree[-1].idx + len(subtree[-1].text),
                            "type": "copular",
                            "subject_tok": char_subject,
                            "nsubj_tok": child if child.pos_ not in ["PROPN", "PRON"] else None
                        }
    return None

# מחלצת ביטוי בינוני — לדוגמה: "wearing a yellow jacket" מ-"The girl wearing a yellow jacket smiled"
def check_participle(token):
    #acl= פסוקית שמתארת שם עצם
    #VBG= פועל בצורת בינוני בהווה כמו: wearing
    if token.dep_ == "acl" and token.pos_ == "VERB" and token.tag_ == "VBG" and token.head.pos_ in ["NOUN", "PROPN", "PRON"]:
        if not any(c.dep_ in ["nsubj", "nsubjpass"] for c in token.children):  # אין נושא משלו — הוא תיאור
            #dobj= מושא ישיר
            #pobj= מושא של מילת יחס
            #prep= תיאור באמצעות מילת יחס
            #מוודא שיש תוכן - מושא לתיאור
            if any(c.dep_ in ["dobj", "obj", "pobj", "prep"] for c in token.children):
                subtree = list(token.subtree)
                subtree.sort(key=lambda t: t.i)  # מבטיח סדר מילים נכון
                return {
                    "text": " ".join([t.text for t in subtree]),
                    "start": subtree[0].idx,
                    "end": subtree[-1].idx + len(subtree[-1].text),
                    "type": "participle",
                    "head_tok": token.head  # שם העצם שהבינוני מתאר
                }
    return None

# מחלצת בינוני נוכח שמזוהה בטעות כ-conj של שם עצם — לדוגמה: "sparkling green eyes" מ-"girl with curly hair and sparkling green eyes"
#sparkling תויג כ conj של hair במקום כתיאור של eyes
def check_conj_participle(token):
    if token.dep_ == "conj" and token.pos_ == "VERB" and token.tag_ == "VBG":
        if token.head.pos_ in ["NOUN", "PROPN"]:  # ה-head הוא שם עצם — הבינוני מתאר אותו
            if not any(c.dep_ in ["nsubj", "nsubjpass"] for c in token.children):  #כאין נושא משלו — הוא תיאור ולא פסוקית
                if any(c.dep_ in ["dobj", "obj"] for c in token.children):  # יש מושא ישיר
                    subtree = list(token.subtree)
                    subtree.sort(key=lambda t: t.i)
                    return {
                        "text": " ".join([t.text for t in subtree]),
                        "start": subtree[0].idx,
                        "end": subtree[-1].idx + len(subtree[-1].text),
                        "type": "conj_participle",
                        "head_tok": token.head  # שם העצם שהבינוני מתאר
                    }
    return None

# מחלצת תואר שם ישיר מרמת הטוקן — דרך אחרת לאתר amod
def check_direct_token_amod(token):
    #amod= תיאור של שם עצם באמצעות תואר
    if token.dep_ == "amod":
        head = token.head  # שם העצם שהתואר מתאר
        amod_tokens = [t for t in head.children if t.dep_ == "amod"]  # כל תוארי השם
        if amod_tokens:
            amod_tokens.sort(key=lambda t: t.i)  # ממיינים לפי סדר במשפט
            poss = None
            if head.text.lower() in _PHYSICAL_NOUNS:
                poss = next((c for c in head.children if c.dep_ == "poss" and c.pos_ == "PRON"), None)
            # אם ה-head הוא שם עצם גוף/הופעה בבעלות דמות — "her sharp gray eyes / his polished shoes"
            # נוסיף poss_tok כדי שעל ידי זה יוכלו לשייך אותו לדמות 
            result = {
                "text": " ".join([t.text for t in amod_tokens]),
                "start": amod_tokens[0].idx,
                "end": amod_tokens[-1].idx + len(amod_tokens[-1].text),
                "type": "amod",
                "head_tok": head,  # שם העצם המתואר
                "poss_tok": poss
            }
            return result
    return None

# מחלצת פסוקית זיקה — לדוגמה: "who was known for his skills"
def check_relative_clause(token):
    if token.dep_ == "relcl" and token.pos_ in ["VERB", "AUX"]:  # פועל של פסוקית זיקה
        if token.head.pos_ in ["NOUN", "PROPN", "PRON"]:  # הפסוקית מתארת דמות
            subtree = list(token.subtree)
            subtree.sort(key=lambda t: t.i)  # מבטיח סדר מילים נכון
            return {
                "text": " ".join([t.text for t in subtree]),
                "start": subtree[0].idx,
                "end": subtree[-1].idx + len(subtree[-1].text),
                "type": "relcl",
                "head_tok": token.head  # הדמות שהפסוקית מתארת
            }
    return None

# מחלצת קניין — לדוגמה: "Harry's messy green eyes" מ-"Harry's"
def check_possessive(token):
    if token.dep_ == "poss":  # הטוקן הוא מציין קניין (Harry's)
        possessed_head = token.head  # שם העצם שבבעלות (eyes)
        subtree = list(possessed_head.subtree)  # כל הענף: "Harry's messy green eyes"
        subtree.sort(key=lambda t: t.i)
        return {
            "text": " ".join([t.text for t in subtree]),
            "start": subtree[0].idx,
            "end": subtree[-1].idx + len(subtree[-1].text),
            "type": "possessive",
            "head_tok": token  # הדמות
        }
    return None

# מחלצת תיאורי have — לדוגמה: "long hair" מ-"She has long hair"
def check_have_possession(token):
    if token.pos_ in ["VERB", "AUX"] and token.lemma_ == "have" and token.tag_ != "VBG":  # פועל have בזמן פשוט בלבד — having מתמשך מציין חוויה לא בעלות
        subject_tok = None
        object_tokens = []  # כל המושאים הישירים
        results = []

        for child in token.children:  # עוברים על ילדי have
            #נושא, נושא במשפט סביל
            if child.dep_ in ["nsubj", "nsubjpass"]:
                subject_tok = child  # הנושא — הדמות שיש לה
            elif child.dep_ in ["dobj", "obj"]:
                object_tokens.append(child)  # מושא ישיר
                for conj_child in child.children:  # מושאים נוספים מחוברים ב-and
                    if conj_child.dep_ == "conj":
                        object_tokens.append(conj_child)
            elif child.dep_ == "conj" and child.pos_ == "VERB":  # פועל מחובר ב-and ("has hair and wears...")
                #פועל נוסף מחובר ב- and: לוקחים את הפועל הנוסף+ המושא שלו יחד כתיאור
                for grandchild in child.children:
                    if grandchild.dep_ in ["dobj", "obj"]:
                        subtree = [child] + list(grandchild.subtree)
                        subtree.sort(key=lambda t: t.i)
                        results.append({
                            "text": " ".join([t.text for t in subtree]),
                            "start": subtree[0].idx,
                            "end": subtree[-1].idx + len(subtree[-1].text),
                            "type": "possession_have",
                            "subject_tok": subject_tok
                        })

        if subject_tok and object_tokens:  # מסננים תוצאות
            for obj_tok in object_tokens:
                has_acl= any(c.dep_ in ["acl", "advcl"] for c in obj_tok.children)  # מושא עם פסוקית משלימה — ביטוי אידיומטי כמו "have a hard time doing"
                #האם המושא מתחיל ב-"a"/"an"
                has_indef_det = any(c.dep_ == "det" and c.text.lower() in ["a", "an"] for c in obj_tok.children)
                #האם יש תואר שם
                has_amod = any(c.dep_ == "amod" for c in obj_tok.children)
                is_idiom= has_acl or(has_indef_det and not has_amod) #מקרה זה לא תאור לדוגמא: "have a chance"
                if not is_idiom:    
                    subtree = list(obj_tok.subtree)
                    subtree.sort(key=lambda t: t.i)
                    #מחזירים רשימה למקרה כזה: "She has long hair, blue eyes, and a warm smile".
                    results.append({
                        "text": " ".join([t.text for t in subtree]),
                        "start": subtree[0].idx,
                        "end": subtree[-1].idx + len(subtree[-1].text),
                        "type": "possession_have",
                        "subject_tok": subject_tok  # הדמות שיש לה
                    })
        #יש דמות וגם תאורים
        if subject_tok and results:
            return results  
    return None

# מחלצת תיאורי "known for X" / "considered as X" 
def check_known_for(token):
    #פסוקית שמתארת שם עצם בתפקיד בינוני עבר
    if token.dep_ == "acl" and token.tag_ == "VBN":  # פועל עבר שמתאר שם עצם (known, considered...)
        if token.head.pos_ in ["NOUN", "PROPN", "PRON"]:  # הוא מתאר דמות
            if any(c.dep_ == "prep" for c in token.children):  # חייב להיות "for"/"as" אחריו — מונע VBN כללי
                subtree = list(token.subtree)
                subtree.sort(key=lambda t: t.i)
                return {
                    "text": " ".join([t.text for t in subtree]),
                    "start": subtree[0].idx,
                    "end": subtree[-1].idx + len(subtree[-1].text),
                    "type": "known_for",
                    "head_tok": token.head
                }
    return None

#מחלצת תפקיד לדוגמא: "served/acted as" — "she served as the leader"
def check_served_as(token):
    if token.lemma_ in ROLE_VERBS and token.pos_ == "VERB":
        subject_tok = None
        role_np = None
        for child in token.children:
            if child.dep_ in ["nsubj", "nsubjpass"]:
                subject_tok = child  # הנושא — הדמות
            #תיאור באמצעות מילת יחס
            if child.dep_ == "prep" and child.text == "as":
                for prep_child in child.children:
                    if prep_child.dep_ == "pobj":
                        role_np = prep_child  # התפקיד שמופיע אחרי "as"
        if subject_tok and role_np:
            subtree = list(role_np.subtree)
            subtree.sort(key=lambda t: t.i)
            return {
                "text": " ".join([t.text for t in subtree]),
                "start": subtree[0].idx,
                "end": subtree[-1].idx + len(subtree[-1].text),
                "type": "served_as",
                "subject_tok": subject_tok
            }
    return None

# מחלצת סדרת תארים בסמוך לדמות — "Avi, organized, calm, and patient"
def check_adj_series(token):
    #שם תואר
    if token.pos_ == "ADJ":
        #appos= תמורה / הסבר נוסף לשם עצם
        if token.dep_ == "appos":  # תואר בתפקיד appos ישיר על הדמות
            return {
                "text": token.text,
                "start": token.idx,
                "end": token.idx + len(token.text),
                "type": "adj_series",
                "head_tok": token.head #הדמות
            }
        #מוודא שהוא מחובר לשם תואר שהוא תאור ולא למשהו אחר
        if token.dep_ == "conj" and token.head.dep_ == "appos" and token.head.pos_ == "ADJ": 
            return {
                "text": token.text,
                "start": token.idx,
                "end": token.idx + len(token.text),
                "type": "adj_series",
                "head_tok": token.head.head  # הדמות היא ה-head של ה-appos
            }
    return None

# מחלצת תואר פועל שמגלה אופי — "he said quietly" / "she answered gently"
def check_behavioral_adverb(token):
    #advmod= תיאור פועל
    #ADV= תואר הפועל
    if token.dep_ == "advmod" and token.pos_ == "ADV":
        verb = token.head
        # פועל ראשי בלבד — לא בתוך פסוקית כי אז זה יהיה התנהגות בהקשר לא תאור אופי
        if verb.pos_ in ["VERB", "AUX"] and verb.dep_ not in ["advcl", "relcl"]:  
            for child in verb.children:
                if child.dep_ in ["nsubj", "nsubjpass"]:
                    return {
                        "text": f"{verb.text} {token.text}",
                        "start": min(verb.idx, token.idx),
                        "end": max(verb.idx + len(verb.text), token.idx + len(token.text)),
                        "type": "behavioral_adverb",
                        "subject_tok": child
                    }
    return None

def check_wearing(token, token_to_chunk):
    #verb= פועל
    #aux= פועל עזר
    if token.pos_ not in ["VERB", "AUX"]:
        return None
    #ההבדל בין המקרים הוא התיוג של ספייסי
    # מקרה 1: פועל לבוש כתיאור 
    #לדוגמה: "wearing a red cloak" מ-"the girl wearing a red cloak"
    #acl= פסוקית שמתארת שם עצם
    #advcl= פסוקית המשמשת כתיאור פועל
    if token.lemma_ in WEARING_LEMMAS_ACL and token.dep_ in ["acl", "advcl"]:
        if token.head.pos_ in ["NOUN", "PROPN", "PRON"]: # שם העצם הוא דמות
            subtree = sorted(token.subtree, key=lambda t: t.i)
            return {
                "text": " ".join(t.text for t in subtree),
                "start": subtree[0].idx,
                "end": subtree[-1].idx + len(subtree[-1].text),
                "type": "wearing",
                "head_tok": token.head # הדמות שלובשת
            }
    #מקרה 2: פועל של לבישה כנשוא ראשי המושא שלו זה תאור
    #לדוגמה: "a blue hat" מ-"She carried a blue hat"
    if token.lemma_ in WEARING_LEMMAS_MAIN:
        subject_tok = None
        object_tok = None
        for child in token.children:
            if child.dep_ in ["nsubj", "nsubjpass"]:
                subject_tok = child # הנושא — הדמות שלובשת
            elif child.dep_ in ["dobj", "obj"]:
                object_tok = child # המושא — מה שלובשים
        if subject_tok and object_tok and object_tok.text.lower() in BODY_OR_CLOTHING_NOUNS:
            np = token_to_chunk.get(object_tok)
            text = np.text if np else object_tok.text
            start = np.start_char if np else object_tok.idx
            end = np.end_char if np else object_tok.idx + len(object_tok.text)
            return {
                "text": text,
                "start": start,
                "end": end,
                "type": "wearing_main",
                "subject_tok": subject_tok
            }
    return None
#בונה מילון שממפה כל תו בטקסט המקורי לדמות
def build_char_lookup(characters):
    char_lookup = {}
    for c_id, character in characters.items():
        for mention in character.mentions:
            for i in range(mention.start, mention.end):
                char_lookup[i] = c_id
    return char_lookup
#ממפה כל טוקן לצירוף השם שלו
def build_token_to_chunk(doc):
    token_to_chunk = {}
    for chunk in doc.noun_chunks:
        for token in chunk:
            token_to_chunk[token] = chunk
    return token_to_chunk

# הפונקציה הראשית — מריצה את כל בדיקות התיאור ומשייכת כל תיאור לדמות המתאימה
def extract_all_descriptions(characters, doc, debug=False):
    char_lookup = build_char_lookup(characters)

    def add_desc_d(char_id, res, func_name):
        add_desc(characters, char_id, res)
        if debug:
            print(f"[DEBUG] {characters[char_id].name} ← \"{res['text']}\" | {func_name}")

    # אזכורים תיאוריים — אזכור שמכיל תוכן תיאורי מתווסף ישירות כתיאור
    # _PRONOUN_TEXTS מיובא מ-constants.py
    for c_id, character in characters.items():
        for mention in character.mentions:
            if mention.text.lower().strip() not in _PRONOUN_TEXTS():
                #מוצא את הטוקנים של ספייסי שנמצאים בגבולות האזכור הזה
                span_tokens = [t for t in doc if mention.start <= t.idx < mention.end]
                #בודקת אם אחד הטוקנים הוא משפט זיקה או אופוזיציה
                has_relcl_or_appos = any(t.dep_ in ["relcl", "appos"] for t in span_tokens)
                #בודקת אם האזכור מתחיל ב-a/an
                starts_indefinite = span_tokens and span_tokens[0].text.lower() in ["a", "an"]
                #בודקת אם מדובר בתיאור
                has_descriptive = has_relcl_or_appos or starts_indefinite
                if has_descriptive:
                    add_desc_d(c_id, {
                        "start": mention.start,
                        "end": mention.end,
                        "text": mention.text,
                        "type": "descriptive_mention"
                    }, "descriptive_mention")

    token_to_chunk = build_token_to_chunk(doc)

    # מחזירה את מזהה הדמות שמכסה את הטווח הנתון
    def get_character_fast(start_char, end_char):
        for i in range(start_char, end_char):
            if i in char_lookup:
                return char_lookup[i]
        return None
    
    # לולאה עבור צירופי שם
    for chunk in doc.noun_chunks: 
        # "she walked in a red coat" 
        res_prep_list = check_prep_with_in(chunk, token_to_chunk) 
        if res_prep_list:
            c_chunk = get_character_fast(chunk.start_char, chunk.end_char)  # הדמות שהצירוף שייך אליה
            if c_chunk:
                for res in res_prep_list:
                    add_desc_d(c_chunk, res, "check_prep_with_in")
        #"John, the detective, ..."
        res_appos = check_appos(chunk, doc, get_character_fast)  # בדיקת אפוזיציה
        if res_appos:
            c_head = get_character_fast(chunk.root.head.idx, chunk.root.head.idx + len(chunk.root.head.text))  # הדמות היא ה-head של האפוזיציה
            if c_head:
                add_desc_d(c_head, res_appos, "check_appos")

    checks = [  # רשימת הבדיקות שירוצו על כל טוקן — בסדר עדיפויות
        check_relative_clause,
        check_copular,
        check_participle,
        check_conj_participle,
        check_known_for,
        check_served_as,
        check_adj_series,
        # check_behavioral_adverb,
        check_direct_token_amod,
        # check_possessive,
        check_have_possession,
    ]

    def apply_result(results, func_name):
        for single_res in results:
            nsubj_tok = single_res.get("nsubj_tok")
            c = get_character_fast(nsubj_tok.idx, nsubj_tok.idx + len(nsubj_tok.text)) if nsubj_tok else None

            if not c:
                target_tok = single_res.get("head_tok") or single_res.get("subject_tok")
                if target_tok:
                    c = get_character_fast(target_tok.idx, target_tok.idx + len(target_tok.text))

            if not c:
                poss_tok = single_res.get("poss_tok")
                if poss_tok:
                    c = get_character_fast(poss_tok.idx, poss_tok.idx + len(poss_tok.text))

            if c:
                add_desc_d(c, single_res, func_name)

    for token in doc:  # לולאה על כל מילה בטקסט
        for check_func in checks:
            res = check_func(token)
            if res:
                apply_result(res if isinstance(res, list) else [res], check_func.__name__)

        res = check_wearing(token, token_to_chunk)
        if res:
            apply_result(res if isinstance(res, list) else [res], "check_wearing")
    characters = clean_overlapping_descriptions(characters)  # ניקוי חפיפות לפני החזרה
    return clean_the_same_desc(characters)
