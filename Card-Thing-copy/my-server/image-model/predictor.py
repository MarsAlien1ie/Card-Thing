import os
import csv
import cv2
import imagehash
import json
from PIL import Image
from ultralytics import YOLO
import sys
import imutils

#for pathing to the write spots
#model_file = './best.pt'
model_file = os.path.join(os.path.dirname(__file__), 'new_best.pt')

#db_file = 'updated_pokemon_card_database.csv'
db_file = os.path.join(os.path.dirname(__file__), 'complete_pokemon_card_database.csv')

# try working_arcanine.jpg / working_forroseed.jpg
#input_picture = './test_images/magmortar.png'

if len(sys.argv) > 1:
    input_picture = sys.argv[1]
else:
    input_picture = './test_images/working_arcanine.jpg'  # fallback for testing, should not occur anymore
    
#output_folder = './predictions_identified'
output_folder = os.path.join(os.path.dirname(__file__), 'predictions_identified')
yolo_confidence_threshold = 0.85
hash_similary_threshold = 14


# john's work from here to json export
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




def find_card_contour(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed_mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)

    contours = cv2.findContours(closed_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = imutils.grab_contours(contours)
    
    if not contours:
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    card_contour = contours[0]
    
    peri = cv2.arcLength(card_contour, True)
    approx = cv2.approxPolyDP(card_contour, 0.02 * peri, True)
        
    if len(approx) == 4:
        return approx
    else:
        rect = cv2.minAreaRect(card_contour)
        box = cv2.boxPoints(rect)
        box = box.astype(int)
        return box

def make_upright(image):
    (h, w) = image.shape[:2]
    if w > h:
        rotated = imutils.rotate_bound(image, angle=90)
        return rotated
    return image





def main():
    if len(sys.argv) < 3:
        print("Usage: predictor.py <input_image_path> <output_json_path>", file=sys.stderr)
        sys.exit(2)

    input_picture = sys.argv[1]
    output_json   = sys.argv[2]

    os.makedirs(output_folder, exist_ok=True)


    model = YOLO(model_file)
    card_database = load_hash_database(db_file)
    print(f"db has {len(card_database)} cards\n")

    os.makedirs(output_folder, exist_ok=True)
    filename = os.path.basename(input_picture)
    print(f"filename: {filename}...")
    
    img = cv2.imread(input_picture)
    if img is None:
        print(f"Could not read image: {input_picture}", file=sys.stderr)
        sys.exit(2)

    img = make_upright(img)
    results = model(img)
    detected_card = None

    for result in results:
        for box in result.boxes:
            if box.conf[0] > yolo_confidence_threshold:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cropped = img[y1:y2, x1:x2]

                if cropped.size == 0:
                    print("Skipping cropped region cause invalid")
                    continue

                cropped_card_pil = Image.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
                cropped_card_hash = imagehash.phash(cropped_card_pil)
                identified_card, distance = find_best_match(cropped_card_hash, card_database)

                if identified_card:
                    detected_card = {
                        "id": identified_card.get('id'),
                        "name": identified_card.get('name'),
                        "set_name": identified_card.get('set_name'),
                        "image_url": identified_card.get('image_url'),
                        "hp": identified_card.get('hp'),
                        "subtypes": identified_card.get('subtypes'),
                        "types": identified_card.get('types'),
                        "rarity": identified_card.get('rarity'),
                    }
                    label_text = f"{detected_card['name']} (set: {detected_card['set_name']})"
                    print(f"Pokemon info: {label_text} (dist: {distance})")
                else:
                    print(f"No match found (dist: {distance})")

                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)



    filename = os.path.basename(input_picture)
    # Ensure .png extension for saving, this may be a problem when inserting other formats, will test later

    save_filename = os.path.splitext(filename)[0] + ".png"
    save_path = os.path.join(output_folder, f"identified_{save_filename}") # save it to the output folder
    cv2.imwrite(save_path, img)
    print(f"Result saved to {save_path}") #for testing

    # save detected card info
    if detected_card:
        output_json_path = sys.argv[2] if len(sys.argv) > 2 else "detected_card.json"
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(detected_card, f, indent=4)
        print(f"Card data exported to {output_json_path}")
        sys.exit(0) #exit code to make sure the c++ code will run
    else:
        print("No valid card identified — nothing exported.") #processor failed to identify or a non-pokemon card image was uploaded
        sys.exit(3)  # failure code for no detection to make sure c++ program doesn't run after

if __name__ == '__main__':
    main()
