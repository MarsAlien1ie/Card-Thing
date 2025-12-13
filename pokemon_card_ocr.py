#!/usr/bin/env python3
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
        Initialize the OCR pipeline with optimized settings for speed.
        
        Args:
            use_gpu: Whether to use GPU for OCR (not currently used)
        """
        print("Initializing OCR pipeline...")
        self.use_structure = False
        self.ocr = None
        
        if PPSTRUCTURE_AVAILABLE:
            try:
                self.ocr = PPStructureV3()
                self.use_structure = True
                print("✓ PP-StructureV3 initialized")
            except Exception as e:
                print(f"⚠️  Error initializing PP-StructureV3: {e}")
                print("   Trying standard PaddleOCR...")
                if PaddleOCR:
                    try:
                        # Use optimized settings: skip angle classification for speed
                        try:
                            self.ocr = PaddleOCR(
                                use_textline_orientation=True,
                                lang='en',
                                use_angle_cls=False,  # Skip angle classification for speed
                                show_log=False
                            )
                        except (TypeError, ValueError):
                            self.ocr = PaddleOCR(
                                use_angle_cls=False,  # Skip angle classification for speed
                                lang='en',
                                show_log=False
                            )
                        self.use_structure = False
                        print("✓ Standard PaddleOCR initialized (optimized for speed)")
                    except Exception as e2:
                        print(f"⚠️  Error initializing PaddleOCR: {e2}")
                        self.ocr = None
                else:
                    print("⚠️  PaddleOCR not available (import failed)")
                    self.ocr = None
        elif PaddleOCR:
            try:
                # Use optimized settings: skip angle classification for speed
                try:
                    self.ocr = PaddleOCR(
                        use_textline_orientation=True,
                        lang='en',
                        use_angle_cls=False,  # Skip angle classification for speed
                        show_log=False
                    )
                except (TypeError, ValueError):
                    self.ocr = PaddleOCR(
                        use_angle_cls=False,  # Skip angle classification for speed
                        lang='en',
                        show_log=False
                    )
                self.use_structure = False
                print("✓ Standard PaddleOCR initialized (optimized for speed)")
            except Exception as e:
                print(f"⚠️  Error initializing PaddleOCR: {e}")
                self.ocr = None
        else:
            print("⚠️  Neither PP-StructureV3 nor PaddleOCR available")
            self.ocr = None
        
        if self.ocr is None:
            print("⚠️  WARNING: OCR is not available. Text extraction will be skipped.")
    
    def preprocess_for_ocr(self, image, fast_mode=True):
        """
        Preprocess image for OCR with optimized settings for speed.
        
        Args:
            image: Input image (BGR format)
            fast_mode: If True, use minimal preprocessing (default True for speed)
            
        Returns:
            Preprocessed image (BGR format)
        """
        # Keep as BGR color image
        if len(image.shape) == 2:
            processed = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            processed = image.copy()
        
        # Use minimal preprocessing for speed (default)
        if fast_mode:
            # Minimal preprocessing: just grayscale conversion for slight denoising
            gray = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)
            processed = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        else:
            # Full preprocessing with CLAHE (slower but better quality)
            lab = cv2.cvtColor(processed, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
            l_enhanced = clahe.apply(l)
            
            lab_enhanced = cv2.merge([l_enhanced, a, b])
            processed = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
        
        return processed
    
    def extract_text_from_card(self, card_image, preprocess=True, save_roi_path=None, fast_mode=True):
        """
        Extract card name from a card image using OCR (optimized for speed).
        
        Args:
            card_image: Card image (BGR format) - should already be rotated/corrected
            preprocess: Whether to preprocess image
            save_roi_path: Optional path to save ROI image for debugging
            fast_mode: If True, use minimal preprocessing (default True for speed)
            
        Returns:
            Dictionary with extracted text and confidence
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
            start_x = max(0, int(w * margin_pct))
            end_x = min(w, int(w * (1.0 - margin_pct)))
            name_roi = card_image[start_y:end_y, start_x:end_x]
        
        # Save ROI for debugging if path provided
        if save_roi_path:
            cv2.imwrite(save_roi_path, name_roi)
        
        # Resize ROI to speed up OCR (max width 600px for better performance, maintain aspect ratio)
        roi_h, roi_w = name_roi.shape[:2]
        max_width = 600  # Smaller size for faster processing
        if roi_w > max_width:
            scale = max_width / roi_w
            new_w = max_width
            new_h = int(roi_h * scale)
            name_roi = cv2.resize(name_roi, (new_w, new_h), interpolation=cv2.INTER_AREA)
            print(f"  [OCR] Resized ROI from {roi_w}x{roi_h} to {new_w}x{new_h} for faster processing")
        
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
                # PP-StructureV3
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
                        print(f"  [OCR] Detected {len(texts)} text element(s):")
                        for i, (text, conf) in enumerate(zip(texts, confidences)):
                            print(f"    [{i+1}] '{text}' (conf: {conf:.3f})")
                        print(f"  [OCR] Combined text: '{combined_text}' (avg conf: {avg_confidence:.3f})")
                        return {
                            'text': combined_text,
                            'confidence': float(avg_confidence),
                            'lines': lines
                        }
                    else:
                        print("  [OCR] No text detected")
                except Exception as e:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                    raise e
            else:
                # Standard PaddleOCR
                if len(processed.shape) == 2:
                    processed_bgr = cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)
                else:
                    processed_bgr = processed
                
                import tempfile
                result = None
                tmp_path = None
                
                try:
                    # Try predict() with numpy array first
                    try:
                        result = self.ocr.predict(processed_bgr)
                    except (TypeError, AttributeError, Exception):
                    # Fallback to temp file (lower quality for speed)
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                        tmp_path = tmp.name
                        cv2.imwrite(tmp_path, processed_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])  # Lower quality for speed
                        result = self.ocr.predict(tmp_path)
                finally:
                    if tmp_path and os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                
                # Parse PaddleOCR result
                lines = []
                texts = []
                confidences = []
                
                if result:
                    # Handle list of OCRResult objects
                    if isinstance(result, (list, tuple)) and len(result) > 0:
                        ocr_result_obj = result[0]
                        
                        # Get rec_texts, rec_scores, rec_polys
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
                        
                        # Ensure lists
                        if not isinstance(rec_texts, list):
                            rec_texts = [rec_texts] if rec_texts else []
                        if not isinstance(rec_scores, list):
                            rec_scores = [rec_scores] if rec_scores else []
                        if not isinstance(rec_polys, list):
                            rec_polys = [rec_polys] if rec_polys else []
                        
                        # Process each text
                        print(f"  [OCR] Processing {len(rec_texts)} detected text element(s)...")
                        for i, text in enumerate(rec_texts):
                            if text and str(text).strip():
                                conf = rec_scores[i] if i < len(rec_scores) else 0.0
                                bbox = rec_polys[i] if i < len(rec_polys) else []
                                if hasattr(bbox, 'tolist'):
                                    bbox = bbox.tolist()
                                
                                text_str = str(text).strip()
                                lines.append({
                                    'text': text_str,
                                    'confidence': float(conf) if conf else 0.0,
                                    'bbox': bbox if bbox else []
                                })
                                texts.append(text_str)
                                confidences.append(float(conf) if conf else 0.0)
                        
                        if not texts:
                            print("  [OCR] No text detected after parsing")
                    
                    # Filter to get largest font size text (card name)
                    if texts:
                        def calculate_font_size(bbox):
                            """Calculate font size from bounding box area."""
                            if not bbox or len(bbox) < 4:
                                return 0
                            try:
                                if isinstance(bbox[0], (list, tuple)) and len(bbox[0]) >= 2:
                                    y_coords = [point[1] if isinstance(point, (list, tuple)) and len(point) >= 2 else 0 
                                               for point in bbox]
                                    x_coords = [point[0] if isinstance(point, (list, tuple)) and len(point) >= 2 else 0 
                                               for point in bbox]
                                    if y_coords and x_coords:
                                        height = max(y_coords) - min(y_coords)
                                        width = max(x_coords) - min(x_coords)
                                        return width * height
                            except:
                                pass
                            return 0
                        
                        # Calculate font sizes and sort
                        text_sizes = [(i, calculate_font_size(lines[i].get('bbox', [])), texts[i]) 
                                     for i in range(len(texts))]
                        text_sizes.sort(key=lambda x: x[1], reverse=True)
                        
                        print(f"  [OCR] Filtering {len(texts)} text element(s) by font size...")
                        for idx, font_size, text in text_sizes:
                            print(f"    - '{text}' (font size: {font_size})")
                        
                        # Filter: keep largest font size text, exclude numbers/HP/STAGE
                        filtered_texts = []
                        filtered_lines = []
                        filtered_confidences = []
                        
                        exclude_patterns = ['HP', 'STAGE', 'STAGEL', 'STAGE1', 'STAGE2', 'BASIC']
                        largest_font_size = text_sizes[0][1] if text_sizes else 0
                        font_size_threshold = largest_font_size * 0.7
                        
                        excluded_count = 0
                        for idx, font_size, text in text_sizes:
                            text_upper = text.upper().strip()
                            if (text.strip().isdigit() or 
                                any(pattern in text_upper for pattern in exclude_patterns) or
                                len(text.strip()) < 2):
                                excluded_count += 1
                                continue
                            
                            if font_size >= font_size_threshold:
                                filtered_texts.append(text)
                                filtered_lines.append(lines[idx])
                                filtered_confidences.append(confidences[idx])
                        
                        if excluded_count > 0:
                            print(f"  [OCR] Excluded {excluded_count} text element(s) (numbers/HP/STAGE/short)")
                        
                        # Fallback to largest text if filtering removed everything
                        if not filtered_texts and text_sizes:
                            print("  [OCR] All texts filtered out, using fallback (largest non-numeric text)")
                            for idx, font_size, text in text_sizes:
                                if not text.strip().isdigit() and len(text.strip()) >= 2:
                                    filtered_texts = [text]
                                    filtered_lines = [lines[idx]]
                                    filtered_confidences = [confidences[idx]]
                                    break
                        
                        # Return filtered or all texts
                        if filtered_texts:
                            combined_text = ' '.join(filtered_texts)
                            avg_confidence = np.mean(filtered_confidences) if filtered_confidences else 0.0
                            print(f"  [OCR] Final card name: '{combined_text}' (confidence: {avg_confidence:.3f})")
                            return {
                                'text': combined_text,
                                'confidence': float(avg_confidence),
                                'lines': filtered_lines
                            }
                        else:
                            combined_text = ' '.join(texts)
                            avg_confidence = np.mean(confidences) if confidences else 0.0
                            print(f"  [OCR] Using all detected text: '{combined_text}' (confidence: {avg_confidence:.3f})")
                            return {
                                'text': combined_text,
                                'confidence': float(avg_confidence),
                                'lines': lines
                            }
            
        except Exception as e:
            print(f"  [OCR] Error: {e}")
            import traceback
            traceback.print_exc()
        
        print("  [OCR] No text extracted")
        return {'text': '', 'confidence': 0.0, 'lines': []}
