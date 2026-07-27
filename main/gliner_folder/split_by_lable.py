from constants import get_time_label, get_location_labels

# מחלקת ישויות ממילון הדמויות לשלוש רשימות נפרדות לפי ה-label שנתן GLiNER.
# מחזירה: (מיקומים, זמנים, שאר — דמויות ובעלי חיים)
def split_entities_by_lable(characters_dict):
    other_list = []     # דמויות, בעלי חיים וכל מה שאינו מיקום/זמן
    time_list = []      # ישויות זמן
    location_list = []  # ישויות מיקום

    for character in characters_dict.values():
        label = character.label

        if character.label == get_time_label():
            time_list.append(character)

        elif character.label in get_location_labels():
            location_list.append(character)

        else:
            other_list.append(character)  # כל label שאינו זמן או מיקום — נחשב דמות

    return location_list, time_list, other_list