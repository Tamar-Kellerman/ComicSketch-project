import requests
from classes.class_mention import Mention
from constants import get_extract_coref_url

# שולחת את הטקסט אל LingMess 
# ומחזירה רשימת אשכולות — כל אשכול הוא קבוצת אזכורים של אותה ישות
def extract_characters_with_mentions(text):
    url = get_extract_coref_url()  # כתובת ה-endpoint של מודל ה-coreference בשרת
    payload = {"text": text} 
    response = requests.post(url, json=payload)  
    result = response.json() 
    clusters = result["clusters"]  # ['Alice', 'she'] :לדוגמא
    clusters_idx = result["clusters_idx"]  # לדוגמא: [(0, 5), (39, 42)]

    character_with_mentions = [] 
    for cluster_texts, cluster_spans in zip(clusters, clusters_idx):
        # יוצרים רשימה מסוג מחלקת Mention
        mentions_list: list[Mention] = [] 
        for mention_text, (start, end) in zip(cluster_texts, cluster_spans):
            mentions_list.append(Mention(start=start, end=end, text=mention_text))
        character_with_mentions.append([
            cluster_texts, mentions_list
        ])
    return character_with_mentions
