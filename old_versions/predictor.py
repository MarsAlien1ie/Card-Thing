import os
import csv
import cv2
import imagehash
from PIL import Image
from ultralytics import YOLO
import imutils
from imutils.perspective import four_point_transform

model_file = './best.pt'
db_file = 'updated_pokemon_card_database.csv'
# try working_arcanine.jpg / working_forroseed.jpg
input_picture = "./test_images/rotated_darkrai.jpg"

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
    model = YOLO(model_file)
    
    card_database = load_hash_database(db_file)
    if card_database is None:
        return    
    os.makedirs(output_folder, exist_ok=True)
    filename = os.path.basename(input_picture)
    
    print(f"Processing: {filename}")
    cv2_image = cv2.imread(input_picture)
  
        
    pil_image = Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))
    annotated_image = cv2_image.copy()
    results = model(cv2_image)
    card_count = 0

    for result in results:
        for box in result.boxes:
            if box.conf[0] > yolo_confidence_threshold:
                
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                
                crop_x1 = max(0, x1 - 5)
                crop_y1 = max(0, y1 - 5)
                crop_x2 = min(cv2_image.shape[1], x2 + 5)
                crop_y2 = min(cv2_image.shape[0], y2 + 5)
                
                card_crop_cv2 = cv2_image[crop_y1:crop_y2, crop_x1:crop_x2]

                upright_image = None
                if card_crop_cv2.shape[0] < 10 or card_crop_cv2.shape[1] < 10:
                    print("crop is too small...")
                else:
                    contour_in_crop = find_card_contour(card_crop_cv2)
                    
                    if contour_in_crop is not None:
                        full_image_contour = contour_in_crop + (crop_x1, crop_y1)
                        warped_image = four_point_transform(cv2_image, full_image_contour.reshape(4, 2))
                        upright_image = make_upright(warped_image)
                    else:
                        print("couldnt find contour...")

                print("Checks if there is a rotation that can be done, otherwise uses the OG image...")
                if upright_image is not None:
                    flat_pil_image = Image.fromarray(cv2.cvtColor(upright_image, cv2.COLOR_BGR2RGB))
                    cropped_card_hash = imagehash.phash(flat_pil_image)
                else:
                    cropped_card_pil = pil_image.crop((x1, y1, x2, y2))
                    cropped_card_hash = imagehash.phash(cropped_card_pil)


                identified_card, distance = find_best_match(cropped_card_hash, card_database)
                
                label_text = f"Unknown (Dist: {distance})"
                if identified_card:
                    card_name = identified_card.get('name', 'N/A')
                    set_name = identified_card.get('set_name', 'N/A')
                    card_number = identified_card.get('number', 'N/A')
                    label_text = f"{card_name} ({set_name} {card_number})"
                    print(f"Match Found: {label_text} (Dist: {distance})")
                else:
                    print(f"No confident match... <15 (Closest dist: {distance})")
                
                save_path_flat = os.path.join(output_folder, f"card_{card_count}_flat_{filename}")
                cv2.imwrite(save_path_flat, upright_image)
                print(f"  > Saved flattened card to {save_path_flat}")
                    
                cv2.rectangle(annotated_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated_image, label_text, (x1, y1 - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                card_count += 1
                
    save_path_annotated = os.path.join(output_folder, f"identified_all_{filename}")
    cv2.imwrite(save_path_annotated, annotated_image)
    print(f"\nsaved image to {save_path_annotated}")

if __name__ == "__main__":
    main()



# def main():
#     model = YOLO(model_file)
#     card_database = load_hash_database(db_file)
#     print(f"db has {len(card_database)} cards\n")

#     os.makedirs(output_folder, exist_ok=True)
#     filename = os.path.basename(input_picture)
#     print(f"filename: {filename}...")
    
#     cv2_image = cv2.imread(input_picture)
#     pil_image = Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))
#     results = model(cv2_image)

#     for result in results:
#         for box in result.boxes:
#             if box.conf[0] > yolo_confidence_threshold:
#                 x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                
#                 cropped_card_pil = pil_image.crop((x1, y1, x2, y2))
#                 cropped_card_hash = imagehash.phash(cropped_card_pil)
#                 identified_card, distance = find_best_match(cropped_card_hash, card_database)
                
#                 label_text = f"???? no idea (closest dist: {distance})"
#                 if identified_card:
#                     card_name = identified_card.get('name')
#                     set_name = identified_card.get('set_name')
#                     card_number = identified_card.get('number')
#                     label_text = f"{card_name} (set: {set_name}, card no: {card_number})"
#                     print(f"Pokemon info: {label_text} (dist: {distance})")
#                 else:
#                     print(f"No match found (dist: {distance})")
                
#                 cv2.rectangle(cv2_image, (x1, y1), (x2, y2), (0, 255, 0), 2)

#     save_path = os.path.join(output_folder, f"identified_{filename}")
#     cv2.imwrite(save_path, cv2_image)
#     print(f"Result saved to {save_path}")

# if __name__ == '__main__':
#     main()

