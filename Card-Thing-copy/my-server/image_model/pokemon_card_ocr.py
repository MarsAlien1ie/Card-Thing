#!/usr/bin/env python3
"""
Pokemon Card OCR - Text Extraction Module
Updated:
1. Compatibility with PaddleOCR v3.0+ (Removed show_log)
2. Speed Optimizations (Fast Mode, No Angle CLS)
3. Accuracy Fix: Crops right 30% of name region to ignore HP/Health
"""

import os
import cv2
import numpy as np

# Try to import PP-StructureV3 first, fallback to PaddleOCR
PPSTRUCTURE_AVAILABLE = False
PaddleOCR = None
PPStructureV3 = None

try:
    from paddleocr import PPStructureV3
    PPSTRUCTURE_AVAILABLE = True
except (ImportError, Exception):
    PPSTRUCTURE_AVAILABLE = False

try:
    from paddleocr import PaddleOCR
except (ImportError, Exception):
    PaddleOCR = None


class PokemonCardOCR:
    """Pokemon card OCR text extraction."""
    
    def __init__(self, use_gpu=False):
        """
        Initialize the OCR pipeline.
        """
        print("Initializing OCR pipeline...")
        self.use_structure = False
        self.ocr = None
        
        # 1. Try PP-StructureV3 (Layout Analysis)
        if PPSTRUCTURE_AVAILABLE:
            try:
                self.ocr = PPStructureV3()
                self.use_structure = True
                print("✓ PP-StructureV3 initialized")
            except Exception as e:
                print(f"⚠️  Error initializing PP-StructureV3: {e}")
                print("   Trying standard PaddleOCR...")
                self.ocr = None 

        # 2. Fallback to Standard PaddleOCR (Text Detection Only)
        if self.ocr is None and PaddleOCR:
            try:
                try:
                    self.ocr = PaddleOCR(
                        use_textline_orientation=True, 
                        lang='en',
                        use_angle_cls=False
                    )
                except (TypeError, ValueError):
                    self.ocr = PaddleOCR(
                        use_angle_cls=False, 
                        lang='en'
                    )
                self.use_structure = False
                print("✓ Standard PaddleOCR initialized (Speed Optimized)")
            except Exception as e2:
                print(f"⚠️  Error initializing PaddleOCR: {e2}")
                self.ocr = None
        elif self.ocr is None:
            print("⚠️  PaddleOCR not available (import failed)")
            self.ocr = None
        
        if self.ocr is None:
            print("⚠️  WARNING: OCR is not available. Text extraction will be skipped.")
    
    def preprocess_for_ocr(self, image, fast_mode=True):
        """
        Preprocess image for better OCR results.
        """
        # Keep as BGR color image
        if len(image.shape) == 2:
            processed = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            processed = image.copy()
        
        if fast_mode:
            # Minimal preprocessing: just grayscale conversion
            gray = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)
            processed = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        else:
            # Heavy Processing
            lab = cv2.cvtColor(processed, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l_enhanced = clahe.apply(l)
            lab_enhanced = cv2.merge([l_enhanced, a, b])
            processed = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
            kernel = np.array([[-1, -1, -1], [-1,  9, -1], [-1, -1, -1]])
            processed = cv2.filter2D(processed, -1, kernel * 0.3)
        
        return processed
    
    def extract_text_from_card(self, card_image, preprocess=True, save_roi_path=None, fast_mode=True):
        """
        Extract card name from a card image using OCR.
        """
        if self.ocr is None:
            return {'text': '', 'confidence': 0.0, 'lines': []}
        
        # Crop to precise ROI where card name is located
        h, w = card_image.shape[:2]
        margin_pct = 0.02
        is_landscape = w > h
        
        if is_landscape:
            # Card is wider than tall - name on left side
            start_x = max(0, int(w * (0.05 - margin_pct)))
            end_x = min(w, int(w * (0.50 + margin_pct)))
            start_y = max(0, int(h * (0.05 - margin_pct)))
            end_y = min(h, int(h * (0.20 + margin_pct)))
            name_roi = card_image[start_y:end_y, start_x:end_x]
        else:
            # Card is taller than wide - name at top
            start_y = max(0, int(h * (0.03 - margin_pct)))
            end_y = min(h, int(h * (0.15 + margin_pct)))
            
            # --- FIX: CROP RIGHT 30% TO REMOVE HP ---
            start_x = max(0, int(w * margin_pct))
            # Was 1.0 (100%), now 0.70 (70%) to avoid HP text on the right
            end_x = min(w, int(w * 0.70)) 
            
            name_roi = card_image[start_y:end_y, start_x:end_x]
        
        # Save ROI for debugging
        if save_roi_path:
            print("not saving image")
        
        # Resize ROI if it is too huge
        roi_h, roi_w = name_roi.shape[:2]
        max_width = 600
        if roi_w > max_width:
            scale = max_width / roi_w
            new_w = max_width
            new_h = int(roi_h * scale)
            name_roi = cv2.resize(name_roi, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        # Preprocess the ROI
        if preprocess:
            processed = self.preprocess_for_ocr(name_roi, fast_mode=fast_mode)
        else:
            if len(name_roi.shape) == 2:
                processed = cv2.cvtColor(name_roi, cv2.COLOR_GRAY2BGR)
            else:
                processed = name_roi
        
        # Run OCR
        print("  [OCR] Extracting text from card...")
        try:
            if self.use_structure:
                # PP-StructureV3 logic
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                    tmp_path = tmp.name
                    cv2.imwrite(tmp_path, processed)
                
                try:
                    result = self.ocr(tmp_path)
                    lines = []
                    texts = []
                    confidences = []
                    
                    if isinstance(result, list):
                        for page in result:
                            if isinstance(page, dict) and 'res' in page:
                                res_data = page['res']
                                if isinstance(res_data, list):
                                    for item in res_data:
                                        if isinstance(item, dict):
                                            text = item.get('text', item.get('content', ''))
                                            conf = item.get('confidence', item.get('score', 0.0))
                                            if text:
                                                lines.append({
                                                    'text': str(text),
                                                    'confidence': float(conf) if conf else 0.0,
                                                    'bbox': item.get('bbox', [])
                                                })
                                                texts.append(str(text))
                                                confidences.append(float(conf) if conf else 0.0)
                    os.unlink(tmp_path)
                    if texts:
                        combined_text = ' '.join(texts)
                        avg_confidence = np.mean(confidences) if confidences else 0.0
                        return {'text': combined_text, 'confidence': float(avg_confidence), 'lines': lines}
                except Exception as e:
                    if os.path.exists(tmp_path): os.unlink(tmp_path)
                    raise e
            else:
                # Standard PaddleOCR logic
                if len(processed.shape) == 2:
                    processed_bgr = cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)
                else:
                    processed_bgr = processed
                
                import tempfile
                result = None
                tmp_path = None
                try:
                    try:
                        result = self.ocr.predict(processed_bgr)
                    except (TypeError, AttributeError, Exception):
                        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                            tmp_path = tmp.name
                            cv2.imwrite(tmp_path, processed_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
                        result = self.ocr.predict(tmp_path)
                finally:
                    if tmp_path and os.path.exists(tmp_path): os.unlink(tmp_path)
                
                lines = []
                texts = []
                confidences = []
                
                if result:
                    if isinstance(result, (list, tuple)) and len(result) > 0:
                        ocr_result_obj = result[0]
                        if hasattr(ocr_result_obj, 'get'):
                            rec_texts = ocr_result_obj.get('rec_texts', [])
                            rec_scores = ocr_result_obj.get('rec_scores', [])
                            rec_polys = ocr_result_obj.get('rec_polys', ocr_result_obj.get('dt_polys', []))
                        elif isinstance(ocr_result_obj, dict):
                            rec_texts = ocr_result_obj.get('rec_texts', [])
                            rec_scores = ocr_result_obj.get('rec_scores', [])
                            rec_polys = ocr_result_obj.get('rec_polys', ocr_result_obj.get('dt_polys', []))
                        else:
                            rec_texts = getattr(ocr_result_obj, 'rec_texts', [])
                            rec_scores = getattr(ocr_result_obj, 'rec_scores', [])
                            rec_polys = getattr(ocr_result_obj, 'rec_polys', getattr(ocr_result_obj, 'dt_polys', []))
                        
                        if not isinstance(rec_texts, list): rec_texts = [rec_texts] if rec_texts else []
                        if not isinstance(rec_scores, list): rec_scores = [rec_scores] if rec_scores else []
                        if not isinstance(rec_polys, list): rec_polys = [rec_polys] if rec_polys else []
                        
                        for i, text in enumerate(rec_texts):
                            if text and str(text).strip():
                                conf = rec_scores[i] if i < len(rec_scores) else 0.0
                                bbox = rec_polys[i] if i < len(rec_polys) else []
                                if hasattr(bbox, 'tolist'): bbox = bbox.tolist()
                                lines.append({'text': str(text).strip(), 'confidence': float(conf) if conf else 0.0, 'bbox': bbox})
                                texts.append(str(text).strip())
                                confidences.append(float(conf) if conf else 0.0)
                    
                    if texts:
                        # Font Size Filtering (Unchanged)
                        def calculate_font_size(bbox):
                            if not bbox or len(bbox) < 4: return 0
                            try:
                                if isinstance(bbox[0], (list, tuple)):
                                    y_coords = [p[1] for p in bbox]
                                    return max(y_coords) - min(y_coords)
                            except: pass
                            return 0
                        
                        text_sizes = [(i, calculate_font_size(lines[i].get('bbox', [])), texts[i]) for i in range(len(texts))]
                        text_sizes.sort(key=lambda x: x[1], reverse=True)
                        
                        filtered_texts = []
                        filtered_confidences = []
                        filtered_lines = []
                        
                        exclude_patterns = ['HP', 'STAGE', 'BASIC']
                        largest_font_size = text_sizes[0][1] if text_sizes else 0
                        
                        for idx, font_size, text in text_sizes:
                            text_upper = text.upper().strip()
                            if (text.strip().isdigit() or any(pattern in text_upper for pattern in exclude_patterns) or len(text.strip()) < 2):
                                continue
                            if font_size >= largest_font_size * 0.7:
                                filtered_texts.append(text)
                                filtered_confidences.append(confidences[idx])
                                filtered_lines.append(lines[idx])
                        
                        if filtered_texts:
                            return {'text': ' '.join(filtered_texts), 'confidence': float(np.mean(filtered_confidences)), 'lines': filtered_lines}
                        else:
                            return {'text': ' '.join(texts), 'confidence': float(np.mean(confidences)), 'lines': lines}
            
        except Exception as e:
            print(f"  [OCR] Error: {e}")
        
        return {'text': '', 'confidence': 0.0, 'lines': []}
