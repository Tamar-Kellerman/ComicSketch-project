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
def clean_overlapping_descriptions(locations):
    for loc_id, location in locations.items():
        descriptions = location.description
        descriptions.sort(key=lambda d: d.start)
        desc_cleaned = descriptions[:1]
        for d in descriptions[1:]:
            last = desc_cleaned[-1]
            if not (last.start <= d.start and d.end <= last.end):
                if d.start <= last.start and last.end <= d.end:
                    desc_cleaned[-1] = d
                else:
                    desc_cleaned.append(d)
        locations[loc_id].description = desc_cleaned
    return locations

# מסירה תיאורים כפולים מבחינת טקסט
def clean_the_same_desc(locations):
    for location in locations.values():
        descs = location.description
        location.description = [
            d for i, d in enumerate(descs)
            if not any(
                d.text.lower().strip() in descs[j].text.lower().strip()
                for j in range(len(descs)) if i != j
            )
        ]
    return locations

# מוסיפה תיאור בודד לרשימת התיאורים של מיקום
def add_desc(locations, loc_id, res):
    locations[loc_id].description.append(
        Description(
            start=res["start"],
            end=res["end"],
            text=res["text"],
            type=res["type"]
        )
    )

# מחלצת ביטוי אפוזיציה — לדוגמה:
# "a brilliant young scientist" מ-"Emma, a brilliant young scientist"
def check_appos(chunk, doc, get_location_fast):
    if chunk.root.dep_ == "appos":
        if chunk.end < len(doc) and doc[chunk.end].text == "!":
            return None
        if get_location_fast(chunk.start_char, chunk.end_char):
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
    found = []
    def collect_from_prep(prep_token):
        for prep_child in prep_token.children:
            if prep_child.dep_ == "pobj":
                np = token_to_chunk.get(prep_child)
                if np:
                    found.append({
                        "text": np.text,
                        "start": np.start_char,
                        "end": np.end_char,
                        "type": "prep"
                    })
                for conj_child in prep_child.children:
                    if conj_child.dep_ == "conj":
                        conj_np = token_to_chunk.get(conj_child)
                        if conj_np:
                            found.append({
                                "text": conj_np.text,
                                "start": conj_np.start_char,
                                "end": conj_np.end_char,
                                "type": "prep"
                            })

    for child in chunk.root.children:
        if child.dep_ == "prep" and child.text in ["with", "in"]:
            collect_from_prep(child)
            for sub_child in child.children:
                if sub_child.dep_ == "conj" and sub_child.text in ["with", "in"]:
                    collect_from_prep(sub_child)
    return found

# מחלצת תיאור קופולרי — לדוגמה: "happy" מ-"Lily is happy"
def check_copular(token):
    if token.pos_ in ["VERB", "AUX"] and token.lemma_ in COPULAR_VERBS:
        if any(c.dep_ == "neg" for c in token.children):
            return None
        for child in token.children:
            if child.dep_ in ["nsubj", "nsubjpass"]:
                if child.pos_ in ["PROPN", "PRON"]:
                    char_subject = child
                    nsubj_noun = None
                else:
                    poss = next((c for c in child.children if c.dep_ == "poss" and c.pos_ == "PRON"), None)
                    if poss:
                        char_subject = poss
                        nsubj_noun = None if child.text.lower() in _PHYSICAL_NOUNS else child
                    else:
                        char_subject = child
                        nsubj_noun = None
                for desc_tok in token.children:
                    if desc_tok.dep_ in ["acomp", "attr"]:
                        is_contextual = desc_tok.dep_ == "acomp" and any(c.dep_ == "prep" for c in desc_tok.children)
                        is_first_person = desc_tok.dep_ == "acomp" and char_subject.text == "I"
                        if not is_contextual and not is_first_person:
                            subtree = list(desc_tok.subtree)
                            subtree.sort(key=lambda t: t.i)
                            desc_text = " ".join([t.text for t in subtree])
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
                    elif desc_tok.dep_ in ["advmod", "advcl"] and desc_tok.tag_ in ["JJ", "JJR", "JJS"]:
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
    if token.dep_ == "acl" and token.pos_ == "VERB" and token.tag_ == "VBG" and token.head.pos_ in ["NOUN", "PROPN", "PRON"]:
        if not any(c.dep_ in ["nsubj", "nsubjpass"] for c in token.children):
            if any(c.dep_ in ["dobj", "obj", "pobj", "prep"] for c in token.children):
                subtree = list(token.subtree)
                subtree.sort(key=lambda t: t.i)
                return {
                    "text": " ".join([t.text for t in subtree]),
                    "start": subtree[0].idx,
                    "end": subtree[-1].idx + len(subtree[-1].text),
                    "type": "participle",
                    "head_tok": token.head
                }
    return None

# מחלצת בינוני נוכח שמזוהה בטעות כ-conj של שם עצם
def check_conj_participle(token):
    if token.dep_ == "conj" and token.pos_ == "VERB" and token.tag_ == "VBG":
        if token.head.pos_ in ["NOUN", "PROPN"]:
            if not any(c.dep_ in ["nsubj", "nsubjpass"] for c in token.children):
                if any(c.dep_ in ["dobj", "obj"] for c in token.children):
                    subtree = list(token.subtree)
                    subtree.sort(key=lambda t: t.i)
                    return {
                        "text": " ".join([t.text for t in subtree]),
                        "start": subtree[0].idx,
                        "end": subtree[-1].idx + len(subtree[-1].text),
                        "type": "conj_participle",
                        "head_tok": token.head
                    }
    return None

# מחלצת תואר שם ישיר מרמת הטוקן — דרך אחרת לאתר amod
def check_direct_token_amod(token):
    if token.dep_ == "amod":
        head = token.head
        amod_tokens = [t for t in head.children if t.dep_ == "amod"]
        if amod_tokens:
            amod_tokens.sort(key=lambda t: t.i)
            poss = None
            if head.text.lower() in _PHYSICAL_NOUNS:
                poss = next((c for c in head.children if c.dep_ == "poss" and c.pos_ == "PRON"), None)
            result = {
                "text": " ".join([t.text for t in amod_tokens]),
                "start": amod_tokens[0].idx,
                "end": amod_tokens[-1].idx + len(amod_tokens[-1].text),
                "type": "amod",
                "head_tok": head,
                "poss_tok": poss
            }
            return result
    return None

# מחלצת פסוקית זיקה — לדוגמה: "who was known for his skills"
def check_relative_clause(token):
    if token.dep_ == "relcl" and token.pos_ in ["VERB", "AUX"]:
        if token.head.pos_ in ["NOUN", "PROPN", "PRON"]:
            subtree = list(token.subtree)
            subtree.sort(key=lambda t: t.i)
            return {
                "text": " ".join([t.text for t in subtree]),
                "start": subtree[0].idx,
                "end": subtree[-1].idx + len(subtree[-1].text),
                "type": "relcl",
                "head_tok": token.head
            }
    return None

# מחלצת קניין — לדוגמה: "Harry's messy green eyes" מ-"Harry's"
def check_possessive(token):
    if token.dep_ == "poss":
        possessed_head = token.head
        subtree = list(possessed_head.subtree)
        subtree.sort(key=lambda t: t.i)
        return {
            "text": " ".join([t.text for t in subtree]),
            "start": subtree[0].idx,
            "end": subtree[-1].idx + len(subtree[-1].text),
            "type": "possessive",
            "head_tok": token
        }
    return None

# מחלצת תיאורי have — לדוגמה: "long hair" מ-"She has long hair"
def check_have_possession(token):
    if token.pos_ in ["VERB", "AUX"] and token.lemma_ == "have" and token.tag_ != "VBG":
        subject_tok = None
        object_tokens = []
        results = []

        for child in token.children:
            if child.dep_ in ["nsubj", "nsubjpass"]:
                subject_tok = child
            elif child.dep_ in ["dobj", "obj"]:
                object_tokens.append(child)
                for conj_child in child.children:
                    if conj_child.dep_ == "conj":
                        object_tokens.append(conj_child)
            elif child.dep_ == "conj" and child.pos_ == "VERB":
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

        if subject_tok and object_tokens:
            for obj_tok in object_tokens:
                has_acl = any(c.dep_ in ["acl", "advcl"] for c in obj_tok.children)
                has_indef_det = any(c.dep_ == "det" and c.text.lower() in ["a", "an"] for c in obj_tok.children)
                has_amod = any(c.dep_ == "amod" for c in obj_tok.children)
                is_idiom = has_acl or (has_indef_det and not has_amod)
                if not is_idiom:
                    subtree = list(obj_tok.subtree)
                    subtree.sort(key=lambda t: t.i)
                    results.append({
                        "text": " ".join([t.text for t in subtree]),
                        "start": subtree[0].idx,
                        "end": subtree[-1].idx + len(subtree[-1].text),
                        "type": "possession_have",
                        "subject_tok": subject_tok
                    })
        if subject_tok and results:
            return results
    return None

# מחלצת תיאורי "known for X" / "considered as X"
def check_known_for(token):
    if token.dep_ == "acl" and token.tag_ == "VBN":
        if token.head.pos_ in ["NOUN", "PROPN", "PRON"]:
            if any(c.dep_ == "prep" for c in token.children):
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

# מחלצת תפקיד לדוגמא: "served/acted as" — "she served as the leader"
def check_served_as(token):
    if token.lemma_ in ROLE_VERBS and token.pos_ == "VERB":
        subject_tok = None
        role_np = None
        for child in token.children:
            if child.dep_ in ["nsubj", "nsubjpass"]:
                subject_tok = child
            if child.dep_ == "prep" and child.text == "as":
                for prep_child in child.children:
                    if prep_child.dep_ == "pobj":
                        role_np = prep_child
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

# מחלצת סדרת תארים בסמוך למיקום — "the market, busy, loud, and crowded"
def check_adj_series(token):
    if token.pos_ == "ADJ":
        if token.dep_ == "appos":
            return {
                "text": token.text,
                "start": token.idx,
                "end": token.idx + len(token.text),
                "type": "adj_series",
                "head_tok": token.head
            }
        if token.dep_ == "conj" and token.head.dep_ == "appos" and token.head.pos_ == "ADJ":
            return {
                "text": token.text,
                "start": token.idx,
                "end": token.idx + len(token.text),
                "type": "adj_series",
                "head_tok": token.head.head
            }
    return None

# מחלצת תואר פועל שמגלה אופי — "he said quietly" / "she answered gently"
def check_behavioral_adverb(token):
    if token.dep_ == "advmod" and token.pos_ == "ADV":
        verb = token.head
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
    if token.pos_ not in ["VERB", "AUX"]:
        return None
    if token.lemma_ in WEARING_LEMMAS_ACL and token.dep_ in ["acl", "advcl"]:
        if token.head.pos_ in ["NOUN", "PROPN", "PRON"]:
            subtree = sorted(token.subtree, key=lambda t: t.i)
            return {
                "text": " ".join(t.text for t in subtree),
                "start": subtree[0].idx,
                "end": subtree[-1].idx + len(subtree[-1].text),
                "type": "wearing",
                "head_tok": token.head
            }
    if token.lemma_ in WEARING_LEMMAS_MAIN:
        subject_tok = None
        object_tok = None
        for child in token.children:
            if child.dep_ in ["nsubj", "nsubjpass"]:
                subject_tok = child
            elif child.dep_ in ["dobj", "obj"]:
                object_tok = child
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

# בונה מילון שממפה כל תו בטקסט המקורי למיקום
def build_loc_lookup(locations):
    loc_lookup = {}
    for loc_id, location in locations.items():
        for mention in location.mentions:
            for i in range(mention.start, mention.end):
                loc_lookup[i] = loc_id
    return loc_lookup

# ממפה כל טוקן לצירוף השם שלו
def build_token_to_chunk(doc):
    token_to_chunk = {}
    for chunk in doc.noun_chunks:
        for token in chunk:
            token_to_chunk[token] = chunk
    return token_to_chunk

# הפונקציה הראשית — מריצה את כל בדיקות התיאור ומשייכת כל תיאור למיקום המתאים
def extract_all_descriptions(locations, doc, debug=False):
    loc_lookup = build_loc_lookup(locations)

    def add_desc_d(loc_id, res, func_name):
        add_desc(locations, loc_id, res)
        if debug:
            print(f"[DEBUG] {locations[loc_id].name} ← \"{res['text']}\" | {func_name}")

    token_to_chunk = build_token_to_chunk(doc)

    # מחזירה את מזהה המיקום שמכסה את הטווח הנתון
    def get_location_fast(start_char, end_char):
        for i in range(start_char, end_char):
            if i in loc_lookup:
                return loc_lookup[i]
        return None

    # לולאה עבור צירופי שם
    for chunk in doc.noun_chunks:
        res_prep_list = check_prep_with_in(chunk, token_to_chunk)
        if res_prep_list:
            c_chunk = get_location_fast(chunk.start_char, chunk.end_char)
            if c_chunk:
                for res in res_prep_list:
                    add_desc_d(c_chunk, res, "check_prep_with_in")
    checks = [
        check_relative_clause,
        check_copular,
        check_participle,
        check_conj_participle,
        check_known_for,
        check_served_as,
        # check_behavioral_adverb,
        # check_possessive,
        check_have_possession,
    ]

    def apply_result(results, func_name):
        for single_res in results:
            nsubj_tok = single_res.get("nsubj_tok")
            c = get_location_fast(nsubj_tok.idx, nsubj_tok.idx + len(nsubj_tok.text)) if nsubj_tok else None

            if not c:
                target_tok = single_res.get("head_tok") or single_res.get("subject_tok")
                if target_tok:
                    c = get_location_fast(target_tok.idx, target_tok.idx + len(target_tok.text))

            if not c:
                poss_tok = single_res.get("poss_tok")
                if poss_tok:
                    c = get_location_fast(poss_tok.idx, poss_tok.idx + len(poss_tok.text))

            if c:
                add_desc_d(c, single_res, func_name)

    for token in doc:
        for check_func in checks:
            res = check_func(token)
            if res:
                apply_result(res if isinstance(res, list) else [res], check_func.__name__)

        res = check_wearing(token, token_to_chunk)
        if res:
            apply_result(res if isinstance(res, list) else [res], "check_wearing")

    locations = clean_overlapping_descriptions(locations)
    return clean_the_same_desc(locations)
