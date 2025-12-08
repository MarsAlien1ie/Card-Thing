import os
import csv
import cv2
import imagehash
from PIL import Image
from ultralytics import YOLO
import imutils
from imutils.perspective import four_point_transform
import numpy as np
import time
from difflib import SequenceMatcher

# Import OCR functionality
from pokemon_card_ocr import PokemonCardOCR

# --- Configuration ---
# MODEL_PATH = './augmented_best.pt'
MODEL_PATH = './new_best.pt'
DATABASE_FILE = 'complete_pokemon_card_database.csv'
IMAGE_PATH = './TEST/2.png'
# IMAGE_PATH = "./test_images/20250507_170952.jpg"
# IMAGE_PATH = "./images/20250507_172051.jpg"
# IMAGE_PATH = './images/20250430_124628.jpg'
IMAGE_PATH = './test_images/working_mcharizard.jpg'
# IMAGE_PATH = './test_images/clean.png'
# IMAGE_PATH = './test_images/20250507_170623.jpg'
# IMAGE_PATH = './images/20250507_171758.jpg'

OUTPUT_FOLDER = './predictions_identified'
YOLO_CONFIDENCE_THRESHOLD = 0.85
HASH_SIMILARITY_THRESHOLD = 15
EARLY_EXIT_THRESHOLD = 6 
CROP_LEVELS = [0.0, 0.05, 0.12]
OCR_SIMILARITY_THRESHOLD = 0.6  # Minimum similarity for OCR matches


def load_hash_database(filepath):
    database = {}
    try:
        with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row.get('p_hash'):
                    try:
                        card_hash = imagehash.hex_to_hash(row['p_hash'])
                        database[card_hash] = row
                    except ValueError:
                        pass
    except FileNotFoundError:
        print(f"Error: Database file not found at {filepath}")
        return None
    return database

def find_best_match(cropped_card_hash, database):   
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
        return imutils.rotate_bound(image, angle=90)
    return image

def identify_raw_crop(pil_crop, database):
    card_hash = imagehash.phash(pil_crop)
    match, distance = find_best_match(card_hash, database)
    return match, distance

def center_crop(image, crop_percent):
    if crop_percent <= 0: return image
    h, w = image.shape[:2]
    y_inset = int(h * crop_percent)
    x_inset = int(w * crop_percent)
    if y_inset * 2 >= h or x_inset * 2 >= w: return image
    return image[y_inset : h - y_inset, x_inset : w - x_inset]

def find_ocr_match_in_database(ocr_text, database_path, threshold=0.6):
    """Find closest matching card name in database using fuzzy string matching."""
    if not ocr_text:
        return None, 0.0, float('inf')
    
    if not os.path.exists(database_path):
        return None, 0.0, float('inf')
    
    best_match = None
    best_score = 0.0
    ocr_lower = ocr_text.lower().strip()
    
    try:
        with open(database_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                card_name = row.get('name', '').lower().strip()
                if not card_name:
                    continue
                
                # Calculate similarity
                similarity = SequenceMatcher(None, ocr_lower, card_name).ratio()
                
                # Check if OCR text is contained in card name or vice versa
                if ocr_lower in card_name or card_name in ocr_lower:
                    similarity = max(similarity, 0.8)
                
                # Word-by-word similarity
                ocr_words = ocr_lower.split()
                card_words = card_name.split()
                if ocr_words and card_words:
                    word_similarities = []
                    for ocr_word in ocr_words:
                        for card_word in card_words:
                            word_sim = SequenceMatcher(None, ocr_word, card_word).ratio()
                            word_similarities.append(word_sim)
                    if word_similarities:
                        max_word_sim = max(word_similarities)
                        similarity = max(similarity, max_word_sim * 0.9)
                
                if similarity > best_score:
                    best_score = similarity
                    best_match = row.copy()
    except Exception as e:
        print(f"    > OCR database search error: {e}")
        return None, 0.0, float('inf')
    
    # Convert similarity to distance for compatibility with hash-based system
    # Similarity 1.0 = distance 0, similarity 0.0 = distance 20
    distance = (1.0 - best_score) * 20
    
    if best_score >= threshold:
        return best_match, best_score, distance
    return None, best_score, distance

def identify_smart_hybrid(cv2_image, contour, crop_x1, crop_y1, raw_crop_pil, database, debug_prefix, output_folder, ocr_pipeline=None):
    candidates = []
    best_candidate_so_far = None
    
    raw_img_cv2 = cv2.cvtColor(np.array(raw_crop_pil), cv2.COLOR_RGB2BGR)

    def process_candidate(name, image_source, match=None, dist=None):
        nonlocal best_candidate_so_far
        if image_source is None or image_source.size == 0: return False
        
        # If match/dist already provided (e.g., from OCR), use them
        if match is not None and dist is not None:
            cand = {
                'type': name,
                'match': match,
                'dist': dist,
                'img': image_source
            }
            candidates.append(cand)
            
            if best_candidate_so_far is None or dist < best_candidate_so_far['dist']:
                best_candidate_so_far = cand
            
            if match and dist <= EARLY_EXIT_THRESHOLD:
                card_name = match.get('name', 'Unknown')
                print(f"    > Early Exit! Found: {card_name} via {name} (Dist: {dist})")
                return True
            return False
        
        # Otherwise, compute hash and match
        pil_conv = Image.fromarray(cv2.cvtColor(image_source, cv2.COLOR_BGR2RGB))
        c_hash = imagehash.phash(pil_conv)
        match, dist = find_best_match(c_hash, database)
        
        cand = {
            'type': name,
            'match': match,
            'dist': dist,
            'img': image_source
        }
        candidates.append(cand)

        if best_candidate_so_far is None or dist < best_candidate_so_far['dist']:
            best_candidate_so_far = cand

        if match and dist <= EARLY_EXIT_THRESHOLD:
            card_name = match.get('name', 'Unknown')
            print(f"    > Early Exit! Found: {card_name} via {name} (Dist: {dist})")
            return True
            
        return False 

    # here crop 3 levels 
    for crop_pct in CROP_LEVELS:
        label_name = f"Raw_{int(crop_pct*100)}pct"
        cropped_view = center_crop(raw_img_cv2, crop_pct)
        if process_candidate(label_name, cropped_view):
            return best_candidate_so_far['match'], best_candidate_so_far['dist'], best_candidate_so_far['img']

    # rotation
    base_for_rotation = center_crop(raw_img_cv2, 0.12)
    
    best_rot_dist = float('inf')
    best_rot_match = None
    best_rot_img = base_for_rotation
    
    for angle in range(-6, 7, 2):
        rotated = imutils.rotate_bound(base_for_rotation, angle)
        h, w = rotated.shape[:2]
        rotated_clean = rotated[4:h-4, 4:w-4] 
        
        rot_pil = Image.fromarray(cv2.cvtColor(rotated_clean, cv2.COLOR_BGR2RGB))
        rot_hash = imagehash.phash(rot_pil)
        r_match, r_dist = find_best_match(rot_hash, database)
        
        if r_dist < best_rot_dist:
            best_rot_dist = r_dist
            best_rot_match = r_match
            best_rot_img = rotated_clean

    rot_cand_name = "Rotated_12pct"
    rot_cand = {
        'type': rot_cand_name,
        'match': best_rot_match,
        'dist': best_rot_dist,
        'img': best_rot_img
    }
    candidates.append(rot_cand)
    
    if best_rot_dist < best_candidate_so_far['dist']:
        best_candidate_so_far = rot_cand
        
    if best_rot_dist <= EARLY_EXIT_THRESHOLD:
        print(f"    > Early Exit! Found: {best_rot_match.get('name')} via {rot_cand_name} (Dist: {best_rot_dist})")
        return best_rot_match, best_rot_dist, best_rot_img

    # flatten
    if contour is not None:
        try:
            full_image_contour = contour + (crop_x1, crop_y1)
            warped_image = four_point_transform(cv2_image, full_image_contour.reshape(4, 2))
            if warped_image.shape[1] > warped_image.shape[0]:
                warped_image = imutils.rotate_bound(warped_image, angle=90)
            
            if process_candidate('Flattened_0pct', warped_image):
                 return best_candidate_so_far['match'], best_candidate_so_far['dist'], best_candidate_so_far['img']

        except Exception as e:
            print(f"  > Flattening failed: {e}")

    # OCR candidate
    if ocr_pipeline is not None:
        try:
            print("    > Trying OCR candidate...")
            ocr_image = best_rot_img if best_rot_img is not None else raw_img_cv2
            
            ocr_result = ocr_pipeline.extract_text_from_card(ocr_image, preprocess=True)
            ocr_text = ocr_result.get('text', '').strip()
            
            if ocr_text:
                ocr_match, ocr_similarity, ocr_dist = find_ocr_match_in_database(
                    ocr_text, DATABASE_FILE, threshold=OCR_SIMILARITY_THRESHOLD
                )
                
                if ocr_match:
                    print(f"    > OCR database match: '{ocr_match.get('name')}' (similarity: {ocr_similarity:.3f}, dist: {ocr_dist:.2f})")
                else:
                    print(f"    > OCR: No database match found (best similarity: {ocr_similarity:.3f}, dist: {ocr_dist:.2f})")
                
                ocr_cand = {
                    'type': 'OCR_TextMatch',
                    'match': ocr_match,
                    'dist': ocr_dist,
                    'img': ocr_image,
                    'ocr_text': ocr_text,
                    'ocr_similarity': ocr_similarity
                }
                candidates.append(ocr_cand)
                
                if best_candidate_so_far is None or ocr_dist < best_candidate_so_far['dist']:
                    best_candidate_so_far = ocr_cand
                
                if ocr_match and ocr_dist <= EARLY_EXIT_THRESHOLD:
                    print(f"    > Early Exit! Found: {ocr_match.get('name')} via OCR (Dist: {ocr_dist:.2f})")
                    return ocr_match, ocr_dist, ocr_image
            else:
                print("    > OCR extracted no text")
        except Exception as e:
            print(f"    > OCR candidate failed: {e}")

    print("    > Candidate Scores (No Early Exit):")
    for c in candidates:
        dist_str = str(c['dist']) if c['dist'] != float('inf') else "inf"
        match_name = c['match'].get('name', 'None') if c['match'] else 'None'
        extra_info = ""
        if c['type'] == 'OCR_TextMatch' and 'ocr_text' in c:
            extra_info = f" (OCR: '{c['ocr_text']}')"
        print(f"      - {c['type']}: {dist_str} -> {match_name}{extra_info}")
        if c['img'] is not None:
            debug_filename = f"{debug_prefix}_{c['type']}_dist{dist_str}.jpg"
            cv2.imwrite(os.path.join(output_folder, debug_filename), c['img'])

    if best_candidate_so_far is None:
        print("    > No candidates found")
        return None, float('inf'), None
    
    winner_name = best_candidate_so_far['match'].get('name', 'Unknown') if best_candidate_so_far['match'] else 'Unknown'
    print(f"    > Winner: {winner_name} via {best_candidate_so_far['type']} (Dist: {best_candidate_so_far['dist']})")
    
    return best_candidate_so_far['match'], best_candidate_so_far['dist'], best_candidate_so_far['img']

def main():
    model = YOLO(MODEL_PATH)
    card_database = load_hash_database(DATABASE_FILE)
    if card_database is None: return 
    
    # Initialize OCR pipeline (optional - will skip OCR if initialization fails)
    print("Initializing OCR pipeline...")
    ocr_pipeline = None
    try:
        ocr_pipeline = PokemonCardOCR(use_gpu=False)
        if ocr_pipeline.ocr is None:
            print("  > OCR not available, continuing without OCR candidate")
            ocr_pipeline = None
        else:
            print("  > OCR initialized successfully")
    except Exception as e:
        print(f"  > OCR initialization failed: {e}")
        print("  > Continuing without OCR candidate")
        ocr_pipeline = None
    
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    filename = os.path.basename(IMAGE_PATH)
    cv2_image = cv2.imread(IMAGE_PATH)
    
    if cv2_image is None:
        print(f"Error: Could not load image: {IMAGE_PATH}")
        return
    
    pil_image = Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))
    annotated_image = cv2_image.copy()
    results = model(cv2_image)
    card_count = 0

    for result in results:
        for box in result.boxes:
            if box.conf[0] > YOLO_CONFIDENCE_THRESHOLD:
                print(f"\n--- Card {card_count} ---")
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                crop_x1, crop_y1 = max(0, x1), max(0, y1)
                crop_x2, crop_y2 = min(cv2_image.shape[1], x2), min(cv2_image.shape[0], y2)
                
                card_crop_cv2 = cv2_image[crop_y1:crop_y2, crop_x1:crop_x2]
                cropped_card_pil = pil_image.crop((crop_x1, crop_y1, crop_x2, crop_y2))
                contour_in_crop = find_card_contour(card_crop_cv2)
                
                debug_prefix = f"debug_card_{card_count}_{filename}"
                
                start_time = time.time()
                
                identified_card, distance, best_image = identify_smart_hybrid(
                    cv2_image, contour_in_crop, crop_x1, crop_y1, cropped_card_pil, 
                    card_database, debug_prefix, OUTPUT_FOLDER, ocr_pipeline=ocr_pipeline
                )
                
                end_time = time.time()
                elapsed_ms = (end_time - start_time) * 1000
                
                if identified_card:
                    c_name = identified_card.get('name', 'N/A')
                    c_set = identified_card.get('set_name', 'N/A')
                    c_num = identified_card.get('number', 'N/A')
                    label_text = f"{c_name} ({c_set} {c_num})"
                    print(f"  > MATCH CONFIRMED: {label_text}")
                else:
                    label_text = f"Unknown (Dist: {distance})"
                    print(f"  > No confident match.")

                print(f"  > Identification took: {elapsed_ms:.2f} ms")

                color = (0, 255, 0) if distance <= 15 else (0, 0, 255)
                cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_image, label_text, (x1, y1 - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
                if best_image is not None:
                     cv2.imwrite(os.path.join(OUTPUT_FOLDER, f"{debug_prefix}_WINNER.jpg"), best_image)

                card_count += 1
                
    cv2.imwrite(os.path.join(OUTPUT_FOLDER, f"identified_all_{filename}"), annotated_image)
    print("\nFinished.")

if __name__ == "__main__":
    main()