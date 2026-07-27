# קורא את כל הקבועים מקובץ JSON חיצוני כדי לאפשר לשנות פרמטרים
# בלי לגעת בקוד — רק בקובץ constants.json.
import json
import os

_here = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(_here, "constants.json")

def _load_config(force_reload=False):
    with open(CONFIG_PATH, encoding="utf-8") as _f:
        return json.load(_f)


def get_config(force_reload=False):
    return _load_config(force_reload)


def _get_value(*path, default=None, force_reload=False):
    data = _load_config(force_reload)
    current = data
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current


# ── Model paths — נתיבים מקומיים למודלים (ללא גישה לאינטרנט) ────────────────
def get_gliner_model_path(force_reload=False):
    return _get_value("model_paths", "GLINER_MODEL_PATH", force_reload=force_reload)


def get_coref_model_path(force_reload=False):
    return _get_value("model_paths", "COREF_MODEL_PATH", force_reload=force_reload)


def get_sbert_model_path(force_reload=False):
    return _get_value("model_paths", "SBERT_MODEL_PATH", force_reload=force_reload)


def get_cross_encoder_path(force_reload=False):
    return _get_value("model_paths", "CROSS_ENCODER_PATH", force_reload=force_reload)


def get_spacy_model(force_reload=False):
    return _get_value("model_paths", "SPACY_MODEL", force_reload=force_reload)


def get_similarity_model_name(force_reload=False):
    return _get_value("model_paths", "SIMILARITY_MODEL_NAME", force_reload=force_reload)


def get_ollama_model(force_reload=False):
    return _get_value("model_paths", "OLLAMA_MODEL", force_reload=force_reload)


# ── Endpoints — כתובות ה-FastAPI server שכל מודול מתקשר אליו ───────────────
def get_extract_entities_url(force_reload=False):
    return _get_value("endpoints", "EXTRACT_ENTITIES_URL", force_reload=force_reload)


def get_extract_coref_url(force_reload=False):
    return _get_value("endpoints", "EXTRACT_COREF_URL", force_reload=force_reload)


def get_generate_description_url(force_reload=False):
    return _get_value("endpoints", "GENERATE_DESCRIPTION_URL", force_reload=force_reload)


def get_batch_similarity_url(force_reload=False):
    return _get_value("endpoints", "BATCH_SIMILARITY_URL", force_reload=force_reload)


def get_scene_continuity_url(force_reload=False):
    return _get_value("endpoints", "SCENE_CONTINUITY_URL", force_reload=force_reload)


# ── Environment variables ────────────────────────────────────────────────────
def get_hf_hub_disable_symlinks_warning(force_reload=False):
    return _get_value("env_vars", "HF_HUB_DISABLE_SYMLINKS_WARNING", force_reload=force_reload)


def get_transformers_offline(force_reload=False):
    return _get_value("env_vars", "TRANSFORMERS_OFFLINE", force_reload=force_reload)


def get_hf_hub_offline(force_reload=False):
    return _get_value("env_vars", "HF_HUB_OFFLINE", force_reload=force_reload)


# ── Thresholds — ספי ביטחון וניכוד; הורדה = יותר ישויות/פיצולים, פחות דיוק ─
def get_gliner_default_threshold(force_reload=False):
    return _get_value("thresholds", "GLINER_DEFAULT_THRESHOLD", force_reload=force_reload)


def get_gliner_places_times_threshold(force_reload=False):
    return _get_value("thresholds", "GLINER_PLACES_TIMES_THRESHOLD", force_reload=force_reload)


def get_scene_continuity_threshold(force_reload=False):
    return _get_value("thresholds", "SCENE_CONTINUITY_THRESHOLD", force_reload=force_reload)


def get_cross_scene_threshold(force_reload=False):
    return _get_value("thresholds", "CROSS_SCENE_THRESHOLD", force_reload=force_reload)


def get_cosimil_similarity_threshold(force_reload=False):
    return _get_value("thresholds", "COSIMIL_SIMILARITY_THRESHOLD", force_reload=force_reload)


def get_sbert_merge_threshold(force_reload=False):
    return _get_value("thresholds", "SBERT_MERGE_THRESHOLD", force_reload=force_reload)


def get_scene_divide_min_score(force_reload=False):
    return _get_value("thresholds", "SCENE_DIVIDE_MIN_SCORE", force_reload=force_reload)


def get_gliner_location_min_score(force_reload=False):
    return _get_value("thresholds", "GLINER_LOCATION_MIN_SCORE", force_reload=force_reload)


# ── LLM options — פרמטרי יצירת טקסט ל-Ollama (generate_description) ─────────
def get_temperature(force_reload=False):
    return _get_value("llm_options", "TEMPERATURE", force_reload=force_reload)


def get_top_p(force_reload=False):
    return _get_value("llm_options", "TOP_P", force_reload=force_reload)


def get_num_predict(force_reload=False):
    return _get_value("llm_options", "NUM_PREDICT", force_reload=force_reload)


# ── Scene / processing params — הגדרות פיצול סצנות ועיבוד כללי ──────────────
def get_context_size(force_reload=False):
    return _get_value("scene_params", "CONTEXT_SIZE", force_reload=force_reload)


def get_min_sentences(force_reload=False):
    return _get_value("scene_params", "MIN_SENTENCES", force_reload=force_reload)


def get_max_tokens(force_reload=False):
    return _get_value("scene_params", "MAX_TOKENS", force_reload=force_reload)


def get_max_chars_if_no_punctuation(force_reload=False):
    return _get_value("scene_params", "MAX_CHARS_IF_NO_PUNCTUATION", force_reload=force_reload)


def get_gliner_max_length(force_reload=False):
    return _get_value("scene_params", "GLINER_MAX_LENGTH", force_reload=force_reload)


def get_merge_short(force_reload=False):
    return _get_value("scene_params", "MERGE_SHORT", force_reload=force_reload)


def get_inherit_time(force_reload=False):
    return _get_value("scene_params", "INHERIT_TIME", force_reload=force_reload)


def get_debug(force_reload=False):
    return _get_value("scene_params", "DEBUG", force_reload=force_reload)


# ── Merge / bonus params — בונוסים למיזוג דמויות לפי שורש שם ומרחק ──────────
def get_bonus_root_match(force_reload=False):
    return _get_value("merge_params", "BONUS_ROOT_MATCH", force_reload=force_reload)


def get_bonus_proximity_max(force_reload=False):
    return _get_value("merge_params", "BONUS_PROXIMITY_MAX", force_reload=force_reload)


# ── GLiNER labels — רשימות ה-labels שGLiNER מחפש בטקסט לכל מטרה ─────────────
def get_places_times_labels(force_reload=False):
    return _get_value("gliner_labels", "PLACES_TIMES_LABELS", force_reload=force_reload)


def get_character_labels(force_reload=False):
    return _get_value("gliner_labels", "CHARACTER_LABELS", force_reload=force_reload)


def get_gliner_time_labels(force_reload=False):
    return set(_get_value("gliner_labels", "GLINER_TIME_LABELS", force_reload=force_reload))


def get_gliner_location_labels(force_reload=False):
    return set(_get_value("gliner_labels", "GLINER_LOCATION_LABELS", force_reload=force_reload))


def get_time_label(force_reload=False):
    return _get_value("gliner_labels", "TIME_LABEL", force_reload=force_reload)


def get_location_labels(force_reload=False):
    return _get_value("gliner_labels", "LOCATION_LABELS", force_reload=force_reload)


# ── Description sets — קבוצות מילים לסינון ומיון תיאורי דמויות ──────────────
def get_wearing_lemmas_main(force_reload=False):
    return set(_get_value("description_sets", "WEARING_LEMMAS_MAIN", force_reload=force_reload))


def get_wearing_lemmas_acl(force_reload=False):
    return set(_get_value("description_sets", "WEARING_LEMMAS_ACL", force_reload=force_reload))


def get_pronoun_texts(force_reload=False):
    return set(_get_value("description_sets", "PRONOUN_TEXTS", force_reload=force_reload))


def get_bad_prefixes(force_reload=False):
    return set(_get_value("description_sets", "BAD_PREFIXES", force_reload=force_reload))


def get_bad_parts(force_reload=False):
    return set(_get_value("description_sets", "BAD_PARTS", force_reload=force_reload))


def get_adj_pos(force_reload=False):
    return set(_get_value("description_sets", "ADJ_POS", force_reload=force_reload))


def get_body_or_clothing_nouns(force_reload=False):
    return set(_get_value("description_sets", "BODY_OR_CLOTHING_NOUNS", force_reload=force_reload))


def get_physical_nouns(force_reload=False):
    return set(_get_value("description_sets", "PHYSICAL_NOUNS", force_reload=force_reload))


def get_copular_verbs(force_reload=False):
    return set(_get_value("description_sets", "COPULAR_VERBS", force_reload=force_reload))


def get_role_verbs(force_reload=False):
    return set(_get_value("description_sets", "ROLE_VERBS", force_reload=force_reload))


# ── Word sets — מילים שמסמנות מעבר/יעד ורגעי זמן; משמשים את divide_spacy ────
def get_temporal_words(force_reload=False):
    return set(_get_value("temporal_words", force_reload=force_reload))


def get_transition_prepositions(force_reload=False):
    return set(_get_value("transition_prepositions", force_reload=force_reload))
