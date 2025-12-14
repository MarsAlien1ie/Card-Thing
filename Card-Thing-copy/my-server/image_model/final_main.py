# branch john_model

import os
import sys
import json
import csv
import cv2
import imagehash
from PIL import Image
from ultralytics import YOLO
import imutils
from imutils.perspective import four_point_transform
import numpy as np
import time
from pokemon_card_ocr import PokemonCardOCR
import Levenshtein


# MODEL_PATH = './augmented_best.pt'
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'new_best.pt')
DATABASE_FILE = os.path.join(os.path.dirname(__file__), 'optimized_pokemon_database.csv')

# IMAGE_PATH = './TEST/2.png'
# IMAGE_PATH = "./test_images/20250507_170952.jpg"
# IMAGE_PATH = "./images/20250507_172051.jpg"
# IMAGE_PATH = './images/20250430_124628.jpg'
IMAGE_PATH = r'.\test\20250507_171630.jpg'

# IMAGE_PATH = './test_images/clean.png'
# IMAGE_PATH = './test_images/20250507_170623.jpg'
# IMAGE_PATH = './images/20250507_171758.jpg'

    # ------------------ WORKING EXMAPLES -------------------------
# IMAGE_PATH = r'.\images\20250508_130248.jpg' # NEGATIVE EXAMPLE
# IMAGE_PATH = './Card-Thing/test_images/working_ferroseed.jpg'
# IMAGE_PATH = './Card-Thing/test_images/working_mcharizard.jpg'
# IMAGE_PATH = r'.\Card-Thing\test_images\FINAL_EXAMPLES\working_turtwig.jpg'
# IMAGE_PATH = r'.\test\working_kleavorVSTAR.jpg'
# IMAGE_PATH = r'.\test\working_darkrai.jpg'
IMAGE_PATH = r'.\Card-Thing\test_images\FINAL_EXAMPLES\working_dialgaV.jpg' 


OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), 'predictions_identified')
YOLO_CONFIDENCE_THRESHOLD = 0.85
HASH_SIMILARITY_THRESHOLD = 14
EARLY_EXIT_THRESHOLD = 6   # the confidence level to just return a card w/o checking other candidates
CROP_LEVELS = [0.0, 0.05, 0.12]
OCR_CONFIDENCE_THRESHOLD = 0.6
MAX_NAME_DISTANCE = 4      # for fuzzy search

def load_image_from_args():
    if len(sys.argv) < 3:
        print("Usage: python final_main.py <image_path> <output_json>")
        sys.exit(2)

    image_path = sys.argv[1]
    output_json = sys.argv[2]

    img = cv2.imread(image_path)
    if img is None:
        print("Failed to load image")
        sys.exit(3)

    return img, output_json

def normalize_string(s):
    if not s: return ""
    return s.lower().strip()

def load_dual_database(filepath):
    print(f"Loading database from {filepath}...")
    hash_db = {}
    text_db = {}
    
    try:
        with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row.get('p_hash'):
                    card_hash = imagehash.hex_to_hash(row['p_hash'])
                    hash_db[card_hash] = row
                
                raw_name = row.get('name', '')
                raw_num = row.get('number', '')
                name_key = normalize_string(raw_name)
                num_key = normalize_string(raw_num)
                
                if name_key:
                    if name_key not in text_db: text_db[name_key] = {}
                    if num_key not in text_db[name_key]: text_db[name_key][num_key] = []
                    text_db[name_key][num_key].append(row)
                    
        print(f"{len(hash_db)} hashes; {len(text_db)} unique names.")
        return hash_db, text_db
        
    except FileNotFoundError:
        print("check db file path name")
        return None, None


def calculate_distance(s1, s2):
    return Levenshtein.distance(s1, s2)

def parse_ocr_result(text):
    words = text.split()
    estimated_name = text
    estimated_number = ""
    for i, word in enumerate(reversed(words)):
        clean_word = ''.join(c for c in word if c.isalnum() or c in '/')
        if any(char.isdigit() for char in clean_word):
            estimated_number = clean_word
            estimated_name = " ".join(words[:-(i+1)])
            break
    return estimated_name, estimated_number

def find_candidates_fuzzy(ocr_name, ocr_number, database):
    candidates = []
    target_name = normalize_string(ocr_name)
    target_num = normalize_string(ocr_number)
    
    if not target_name: return []

    for db_name_key in database.keys():
        dist = calculate_distance(target_name, db_name_key)
        is_substring = (target_name in db_name_key) if len(target_name) > 3 else False
        
        if dist <= MAX_NAME_DISTANCE or is_substring:
            number_map = database[db_name_key]
            if not target_num:
                for card_list in number_map.values():
                    candidates.extend(card_list)
            else:
                if target_num in number_map:
                    candidates.extend(number_map[target_num])
                else:
                    for db_num_key in number_map.keys():
                        if calculate_distance(target_num, db_num_key) <= 1:
                            candidates.extend(number_map[db_num_key])
    return candidates

def find_best_hash_match(cropped_card_hash, database):   
    best_match = None
    smallest_distance = float('inf')
    for db_hash, card_info in database.items():
        distance = cropped_card_hash - db_hash
        if distance < smallest_distance:
            smallest_distance = distance
            best_match = card_info
    if best_match and smallest_distance <= HASH_SIMILARITY_THRESHOLD:
        return best_match, smallest_distance
    return None, smallest_distance

def center_crop(image, crop_percent):
    if crop_percent <= 0: return image
    h, w = image.shape[:2]
    y_inset = int(h * crop_percent)
    x_inset = int(w * crop_percent)
    if y_inset * 2 >= h or x_inset * 2 >= w: return image
    return image[y_inset : h - y_inset, x_inset : w - x_inset]

def find_card_contour(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed_mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    contours = cv2.findContours(closed_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = imutils.grab_contours(contours)
    if not contours: return None
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    card_contour = contours[0]
    peri = cv2.arcLength(card_contour, True)
    approx = cv2.approxPolyDP(card_contour, 0.02 * peri, True)
    if len(approx) == 4: return approx
    rect = cv2.minAreaRect(card_contour)
    return cv2.boxPoints(rect).astype(int)

def identify_smart_hybrid(cv2_image, contour, crop_x1, crop_y1, raw_crop_pil, hash_db, text_db, debug_prefix, output_folder, ocr_pipeline=None):
    
    raw_img_cv2 = cv2.cvtColor(np.array(raw_crop_pil), cv2.COLOR_RGB2BGR)

    candidates = []
    best_candidate_so_far = None

    def process_phash_candidate(name, image_source):
        nonlocal best_candidate_so_far
        if image_source is None or image_source.size == 0: return False
        
        pil_conv = Image.fromarray(cv2.cvtColor(image_source, cv2.COLOR_BGR2RGB))
        c_hash = imagehash.phash(pil_conv)
        match, dist = find_best_hash_match(c_hash, hash_db)
        
        cand = {'type': name, 'match': match, 'dist': dist, 'img': image_source, 'hash': c_hash}
        candidates.append(cand)

        if best_candidate_so_far is None or dist < best_candidate_so_far['dist']:
            best_candidate_so_far = cand
        return False

    for crop_pct in CROP_LEVELS:
        process_phash_candidate(f"Raw_{int(crop_pct*100)}pct", center_crop(raw_img_cv2, crop_pct))

    # rotated card
    base_for_rotation = center_crop(raw_img_cv2, 0.12)
    for angle in range(-6, 7, 2):
        rotated = imutils.rotate_bound(base_for_rotation, angle)
        h, w = rotated.shape[:2]
        rotated_clean = rotated[4:h-4, 4:w-4] 
        process_phash_candidate(f"Rotated_{angle}deg", rotated_clean)

    # flattened card
    if contour is not None:
        try:
            full_image_contour = contour + (crop_x1, crop_y1)
            warped_image = four_point_transform(cv2_image, full_image_contour.reshape(4, 2))
            if warped_image.shape[1] > warped_image.shape[0]: 
                warped_image = imutils.rotate_bound(warped_image, angle=90)
            process_phash_candidate('Flattened', warped_image)
        except Exception: pass

    # early exit if true ?
    if best_candidate_so_far['dist'] <= EARLY_EXIT_THRESHOLD:
        print(f"Early exit: {best_candidate_so_far['match']['name']} w/ Dist: {best_candidate_so_far['dist']}")
        return best_candidate_so_far['match'], best_candidate_so_far['dist'], best_candidate_so_far['img']

    # OCR
    if ocr_pipeline is not None:
        try:
            best_aligned_img = best_candidate_so_far['img']
            roi_path = os.path.join(output_folder, f"{debug_prefix}_OCR_ROI.jpg")
            
            ocr_result = ocr_pipeline.extract_text_from_card(
                best_aligned_img, 
                preprocess=True,
                save_roi_path=roi_path
            )
            
            ocr_text = ocr_result.get('text', '').strip()
            ocr_conf = ocr_result.get('confidence', 0.0)
            
            if ocr_text and ocr_conf >= OCR_CONFIDENCE_THRESHOLD:
                print(f"OCR TEXT: '{ocr_text}' w/ CONFIDENCE: {ocr_conf:.2f}")
                
                est_name, est_num = parse_ocr_result(ocr_text)
                text_candidates = find_candidates_fuzzy(est_name, est_num, text_db)
                
                if text_candidates:
                    print(f"There are {len(text_candidates)} candidates")
                    
                    current_hash = best_candidate_so_far['hash']
                    ranked_candidates = []
                    
                    for cand in text_candidates:
                        if cand.get('p_hash'):
                            db_hash = imagehash.hex_to_hash(cand['p_hash'])
                            dist = current_hash - db_hash
                            # if the exact name is found give it more priority(?)
                            if normalize_string(cand['name']) == normalize_string(est_name):
                                dist -= 7
                            ranked_candidates.append((dist, cand))
                
                    ranked_candidates.sort(key=lambda x: x[0])
                    
                    if ranked_candidates:
                        best_hybrid_dist, best_hybrid_card = ranked_candidates[0]
                        print(f"Best OCR+search Match: {best_hybrid_card['name']} w/ Dist: {best_hybrid_dist}")
                        
                        # only accept OCR results if it meets the threshold, else fallbcak to original method
                        if best_hybrid_dist < 12:
                            return best_hybrid_card, best_hybrid_dist, best_aligned_img
                        else:
                            print(f"RESULT has distance: {best_hybrid_dist} >= 12. Fallback")

        except Exception as e:
            print(f"error: {e}")


    print(f"OCR failed, fallback")
    return best_candidate_so_far['match'], best_candidate_so_far['dist'], best_candidate_so_far['img']


def main():
    model = YOLO(MODEL_PATH)
    
    hash_db, text_db = load_dual_database(DATABASE_FILE)
    if hash_db is None: return 
    
    ocr_pipeline = None
    try:
        ocr_pipeline = PokemonCardOCR(use_gpu=False)
        if ocr_pipeline.ocr is None:
            print("OCR Engine not working?")
            ocr_pipeline = None
        else:
            print("OCR initialized")
    except Exception as e:
        print(f" OCR error: {e}")
    
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    cv2_image, output_json_path = load_image_from_args()

    if cv2_image is None: 
        print(f"Error: Could not load image {IMAGE_PATH}")
        return
    
    pil_image = Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))
    annotated_image = cv2_image.copy()
    results = model(cv2_image, verbose=False)
    card_count = 0

    for result in results:
        for box in result.boxes:
            if box.conf[0] > YOLO_CONFIDENCE_THRESHOLD:
                print(f"\n--- Card #{card_count} ---")
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                crop_x1, crop_y1 = max(0, x1), max(0, y1)
                crop_x2, crop_y2 = min(cv2_image.shape[1], x2), min(cv2_image.shape[0], y2)
                
                card_crop_cv2 = cv2_image[crop_y1:crop_y2, crop_x1:crop_x2]
                cropped_card_pil = pil_image.crop((crop_x1, crop_y1, crop_x2, crop_y2))
                contour_in_crop = find_card_contour(card_crop_cv2)
                
                debug_prefix = f"debug_card_{card_count}_card"
                start_time = time.time()
                
                identified_card, distance, best_image = identify_smart_hybrid(
                    cv2_image, contour_in_crop, crop_x1, crop_y1, cropped_card_pil, 
                    hash_db, text_db, debug_prefix, OUTPUT_FOLDER, ocr_pipeline
                )
                
                elapsed_ms = (time.time() - start_time) * 1000

    if identified_card:
        output_data = {
        "id": identified_card.get("id"),
        "name": identified_card.get("name"),
        "set_name": identified_card.get("set_name"),
        "number": identified_card.get("number"),
        "hp": identified_card.get("hp"),
        "types": identified_card.get("types"),
        "rarity": identified_card.get("rarity"),
        "image_url": identified_card.get("image_url")
        }

        with open(output_json_path, "w") as f:
            json.dump(output_data, f, indent=2)

        print("Card data exported to", output_json_path)
    else:
        print("No card identified")
        sys.exit(3)

                
    if identified_card:
        c_name = identified_card.get('name', 'N/A')
        c_set = identified_card.get('set_name', 'N/A')
        c_id = identified_card.get('id', 'N/A')
        c_num = identified_card.get('number', 'N/A')
                        
        print(f"    IDENTIFIED CARD:")
        print(f"    - Name:   {c_name}")
        print(f"    - Set:    {c_set}")
        print(f"    - ID:     {c_id}")
        print(f"    - Number: {c_num}")
        print(f"    - Dist: {distance}")

        label_text = f"{c_name} | {c_set} #{c_num}"
    else:
        label_text = f"No card w/ Dist: {distance}"
        print(f"No confident match found.")

        print(f"Time: {elapsed_ms:.2f} ms aka {elapsed_ms/1000:.2f} secs")

        color = (0, 255, 0) if (identified_card) else (0, 0, 255)
        cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 2)
        cv2.putText(annotated_image, label_text, (x1, y1 - 10), 
        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
        if best_image is not None:
            cv2.imwrite(os.path.join(OUTPUT_FOLDER, f"{debug_prefix}_WINNER.jpg"), best_image)

            card_count += 1
                
    #cv2.imwrite(os.path.join(OUTPUT_FOLDER, f"identified_all_cards"), annotated_image)
    print("\nFinished")

if __name__ == "__main__":
    main()
