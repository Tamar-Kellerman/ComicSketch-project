from fastapi import FastAPI
from pydantic import BaseModel
from gliner import GLiNER
from sentence_transformers import SentenceTransformer, util, CrossEncoder
from fastcoref import FCoref
from fastcoref.modeling import FCorefModel, LingMessModel, LeftOversCollator
import torch
import os
import ollama
from constants import (
    get_coref_model_path, get_sbert_model_path, get_gliner_model_path, get_cross_encoder_path,
    get_gliner_default_threshold, get_temperature, get_top_p, get_num_predict, get_ollama_model,
    get_hf_hub_disable_symlinks_warning, get_transformers_offline, get_hf_hub_offline,
)
# f_coref_path = r"C:\Users\User\Downloads\f_coref_model"
f_coref_path = get_coref_model_path()
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = get_hf_hub_disable_symlinks_warning()
os.environ["TRANSFORMERS_OFFLINE"] = get_transformers_offline()
os.environ["HF_HUB_OFFLINE"] = get_hf_hub_offline()

FCorefModel.all_tied_weights_keys = {}   # עוקף בעיית טעינת משקלים ב-FCoref
LingMessModel.all_tied_weights_keys = {} # עוקף בעיית טעינת משקלים ב-LingMess

CorefPredictor = FCoref.__bases__[0]  # שולפים את מחלקת הבסיס של FCoref כדי לטעון LingMess דרכה

print("Loading models into RAM... Please wait.")

device = "cuda" if torch.cuda.is_available() else "cpu"  # משתמשים ב-GPU אם זמין

from concurrent.futures import ThreadPoolExecutor

# כל מודל נטען בפונקציה נפרדת כדי לאפשר טעינה מקבילית דרך ThreadPoolExecutor
def load_similarity():
    return SentenceTransformer(get_sbert_model_path(), local_files_only=True)  # SBERT למיזוג שמות

def load_gliner():
    return GLiNER.from_pretrained(get_gliner_model_path())  # זיהוי ישויות

def load_coref():
    return CorefPredictor(f_coref_path, LingMessModel, LeftOversCollator, True)  # LingMess coreference

def load_cross():
    return CrossEncoder(get_cross_encoder_path(), device=device)  # Cross-Encoder לפיצול סצנות

# טוענים את כל המודלים במקביל — חוסך זמן משמעותי בעלייה
with ThreadPoolExecutor(max_workers=4) as executor:
    f_sim   = executor.submit(load_similarity)
    f_glin  = executor.submit(load_gliner)
    f_coref = executor.submit(load_coref)
    f_cross = executor.submit(load_cross)
    similarity_model  = f_sim.result()
    gliner_model      = f_glin.result()
    coref_model       = f_coref.result()
    cross_judge_model = f_cross.result()

print(f"All heavy models loaded successfully on {device}! Server is ready.")

app = FastAPI()  # יוצרים את אפליקציית FastAPI

# מבני נתונים לבקשות הנכנסות — Pydantic מאמת את הסכמה אוטומטית

class SimilarityRequest(BaseModel):
    text1: str  # טקסט ראשון לחישוב דמיון
    text2: str  # טקסט שני לחישוב דמיון

class GlinerRequest(BaseModel):
    text: str        # הטקסט לזיהוי ישויות
    labels: list     # קטגוריות לחיפוש
    threshold: float = get_gliner_default_threshold()  # סף ביטחון ברירת מחדל

class CorefRequest(BaseModel):
    text: str  # הטקסט להרצת coreference

class SceneContinuityRequest(BaseModel):
    text1: str  # הקשר הסצנה הנוכחית
    text2: str  # המשפט שנבדק

class BatchSimilarityRequest(BaseModel):
    names: list[str]  # רשימת שמות לחישוב מטריצת דמיון

class DescriptionRequest(BaseModel):
    name: str
    label: str
    details: str

# שולחת שם + קטגוריה + פרטי תיאורים גולמיים ל-Ollama ומקבלת תיאור אחד מרוכב
@app.post("/generate_description")
def generate_description(data: DescriptionRequest):
    messages = [
        {
            "role": "system",
            "content": (
                "You are an objective editor. "
                "Combine the given static character details into one fluent factual description. "
                "Do not invent any new information."
            )
        },
        {
            "role": "user",
            "content": (
                f"Name: {data.name}\n"
                f"Category: {data.label}\n"
                f"Details: {data.details}"
            )
        }
    ]

    response = ollama.chat(
        model=get_ollama_model(),
        messages=messages,
        options={
            "temperature": get_temperature(),
            "top_p": get_top_p(),
            "num_predict": get_num_predict(),
        }
    )

    return {
        "description": response.message.content.strip()
    }
# מחשבת מטריצת דמיון בין כל זוג שמות ברשימה — שימושית למיזוג דמויות
@app.post("/batch_similarity_matrix")
def batch_similarity_matrix(data: BatchSimilarityRequest):
    if not data.names:  # אם הרשימה ריקה — מחזירים מטריצה ריקה
        return {"matrix": []}
    embeddings = similarity_model.encode(data.names, convert_to_tensor=True)  # מקודדים את כל השמות בבת אחת
    cos_sim_matrix = util.cos_sim(embeddings, embeddings).tolist()  # מחשבים דמיון קוסינוס בין כל הזוגות
    return {"matrix": cos_sim_matrix}

# מחשבת דמיון סמנטי בין שני טקסטים
@app.post("/similarity")
def check_similarity(data: SimilarityRequest):
    emb1 = similarity_model.encode(data.text1, convert_to_tensor=True)  # וקטור טקסט ראשון
    emb2 = similarity_model.encode(data.text2, convert_to_tensor=True)  # וקטור טקסט שני
    score = util.cos_sim(emb1, emb2).item()  # ציון דמיון בין 0 ל-1
    return {"similarity_score": score}

# מריצה GLiNER על הטקסט ומחזירה ישויות שזוהו לפי הקטגוריות שנשלחו
@app.post("/extract_entities")
def extract_entities(data: GlinerRequest):
    entities = gliner_model.predict_entities(data.text, data.labels, threshold=data.threshold, max_length=128)  # הרצת GLiNER
    output = []
    for entity in entities:  # עוברים על כל ישות שזוהתה
        output.append({
            "start": entity["start"],  # אינדקס תחילת הישות
            "end": entity["end"],      # אינדקס סוף הישות
            "label": entity["label"],  # קטגוריה
            "text": entity["text"],    # הטקסט שזוהה
            "score": entity["score"]   # ציון ביטחון
        })
    return {"entities": output}

# מריצה coreference resolution ומחזירה אשכולות אזכורים
@app.post("/extract_coref")
def extract_coref(data: CorefRequest):
    preds = coref_model.predict(texts=[data.text])  # הרצת המודל
    clusters = preds[0].get_clusters()                           # אשכולות כטקסט
    clusters_idx = preds[0].get_clusters(as_strings=False)       # אשכולות כאינדקסי תווים
    return {
        "clusters": clusters,
        "clusters_idx": clusters_idx
    }

# מחזירה ציון רציפות נרטיבית בין שני טקסטים — משמש לפיצול סצנות
@app.post("/predict_scene_continuity")
def predict_scene_continuity(data: SceneContinuityRequest):
    pairs = [(data.text1, data.text2)]  # Cross-Encoder מקבל זוג טקסטים
    score = cross_judge_model.predict(pairs)[0]  # ציון בין 0 ל-1 — גבוה = אותה סצנה
    return {"score": float(score)}
