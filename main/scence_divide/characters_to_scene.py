def get_characters_per_scene(scenes, characters):
    """
    מחזירה לכל סצנה את רשימת הדמויות שמוזכרות בה.

    scenes: רשימת dict עם start_char ו-end_char (פלט של split_story_to_scenes)
    characters: dict של {c_id: Character} — כל דמות עם רשימת mentions

    מחזירה: רשימת lists, כל אחת מכילה שמות הדמויות שהופיעו באותה סצנה.
    """
    if not scenes or not characters:
        return [[] for _ in scenes]

    scene_bounds = [(s.start_char, s.end_char) for s in scenes]
    n = len(scenes)
    result = [set() for _ in range(n)]

    for character in characters.values():
        for mention in character.mentions:
            for idx, (s_start, s_end) in enumerate(scene_bounds):
                if s_start <= mention.start < s_end:
                    result[idx].add(character.name)
                    break

    return [sorted(names) for names in result]
