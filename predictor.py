import os
import csv
import cv2
import imagehash
from PIL import Image
from ultralytics import YOLO

model_file = './best.pt'
db_file = 'updated_pokemon_card_database.csv'
# try working_arcanine.jpg / working_forroseed.jpg
input_picture = './test_images/working_ferroseed.jpg'
output_folder = './predictions_identified'
yolo_confidence_threshold = 0.85
hash_similary_threshold = 14


def load_hash_database(filepath):
    database = {}
    with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row['p_hash']:
                card_hash = imagehash.hex_to_hash(row['p_hash'])
                database[card_hash] = row
    return database

def find_best_match(cropped_card_hash, database):
    best_match = None
    smallest_distance = 1000000

    for db_hash, card_info in database.items():
        distance = cropped_card_hash - db_hash
        if distance < smallest_distance:
            smallest_distance = distance
            best_match = card_info

    if smallest_distance <= hash_similary_threshold:
        return best_match, smallest_distance
    return None, smallest_distance

def main():
    model = YOLO(model_file)
    card_database = load_hash_database(db_file)
    print(f"db has {len(card_database)} cards\n")

    os.makedirs(output_folder, exist_ok=True)
    filename = os.path.basename(input_picture)
    print(f"filename: {filename}...")
    
    cv2_image = cv2.imread(input_picture)
    pil_image = Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))
    results = model(cv2_image)

    for result in results:
        for box in result.boxes:
            if box.conf[0] > yolo_confidence_threshold:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                
                cropped_card_pil = pil_image.crop((x1, y1, x2, y2))
                cropped_card_hash = imagehash.phash(cropped_card_pil)
                identified_card, distance = find_best_match(cropped_card_hash, card_database)
                
                label_text = f"???? no idea (closest dist: {distance})"
                if identified_card:
                    card_name = identified_card.get('name')
                    set_name = identified_card.get('set_name')
                    card_number = identified_card.get('number')
                    label_text = f"{card_name} (set: {set_name}, card no: {card_number})"
                    print(f"Pokemon info: {label_text} (dist: {distance})")
                else:
                    print(f"No match found (dist: {distance})")
                
                cv2.rectangle(cv2_image, (x1, y1), (x2, y2), (0, 255, 0), 2)

    save_path = os.path.join(output_folder, f"identified_{filename}")
    cv2.imwrite(save_path, cv2_image)
    print(f"Result saved to {save_path}")

if __name__ == '__main__':
    main()

