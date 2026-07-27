from classes.class_location import Location
from classes.class_mention import Mention
from constants import get_gliner_location_min_score

# בודקת האם שני טווחים חופפים
def is_overlap(start1, end1, start2, end2):
    return start1 < end2 and start2 < end1

# ממזגת מיקומים בעלי שם זהה — שומרת את זה עם יותר אזכורים
def merge_locations_last(gliner_locations):
    to_remove = set()
    for loc in list(gliner_locations.values()):
        for else_loc in list(gliner_locations.values()):
            if loc.idx in to_remove or else_loc.idx in to_remove:
                continue
            if loc.name.strip().lower() == else_loc.name.strip().lower() and loc.idx != else_loc.idx:
                if len(loc.mentions) < len(else_loc.mentions):
                    loc.mentions.extend(else_loc.mentions)
                    to_remove.add(else_loc.idx)
                else:
                    else_loc.mentions.extend(loc.mentions)
                    to_remove.add(loc.idx)
    for idx in to_remove:
        gliner_locations.pop(idx, None)
    return gliner_locations

# בונה dict של Location objects מפלט GLiNER
def build_location_objects(gliner_output, location_labels):
    locations = {}
    for entity in gliner_output:
        label = str(entity.get("label", "")).lower().strip()
        if label not in location_labels:
            continue
        name = entity.get("text", "").strip()
        start = entity.get("start")
        end = entity.get("end")
        score = entity.get("score", 0.0)
        if not name or start is None or end is None or score < get_gliner_location_min_score():
            continue
        mention = Mention(start=start, end=end, text=name)
        loc = Location(
            name=name,
            label=label,
            score=score,
            mentions=[mention],
            description=[],
        )
        locations[loc.idx] = loc
    return locations

# ממזגת אשכולות coref עם מיקומי GLiNER — כמו merge_characters אבל למיקומים
def merge_locations(coref_clusters, gliner_locations):
    for cluster in coref_clusters:
        loc_muamdim_for_cluster = []
        for mention in cluster[1]:
            for key, loc in gliner_locations.items():
                if is_overlap(mention.start, mention.end, loc.mentions[0].start, loc.mentions[0].end):
                    loc_muamdim_for_cluster.append(key)
                    if mention.end - mention.start < loc.mentions[0].end - loc.mentions[0].start:
                        mention = loc.mentions[0]
        if loc_muamdim_for_cluster:
            best_loc = 0
            max_score = 0
            for loc_key in loc_muamdim_for_cluster:
                if gliner_locations[loc_key].score > max_score:
                    max_score = gliner_locations[loc_key].score
                    best_loc = loc_key
            if best_loc:
                gliner_locations[best_loc].mentions.extend(cluster[1])
                for loc_key in loc_muamdim_for_cluster:
                    if loc_key != best_loc:
                        gliner_locations.pop(loc_key, None)
    gliner_locations = merge_locations_last(gliner_locations)
    return gliner_locations
