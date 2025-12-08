#!/usr/bin/env python3
"""
Standalone OCR Test Script

Run OCR on a card image independently to see detailed logging.
Usage: python test_ocr_standalone.py <image_path>
"""

import sys
import os
import cv2
from pokemon_card_ocr import PokemonCardOCR

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_ocr_standalone.py <image_path>")
        print("Example: python test_ocr_standalone.py ./test_images/working_mcharizard.jpg")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        sys.exit(1)
    
    print("=" * 60)
    print("OCR Standalone Test")
    print("=" * 60)
    print(f"Image: {image_path}\n")
    
    # Load image
    print("Loading image...")
    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Could not load image: {image_path}")
        sys.exit(1)
    
    h, w = image.shape[:2]
    print(f"Image size: {w}x{h}\n")
    
    # Initialize OCR
    print("=" * 60)
    ocr_pipeline = PokemonCardOCR(use_gpu=False)
    
    if ocr_pipeline.ocr is None:
        print("\nError: OCR initialization failed. Cannot proceed.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("Running OCR extraction...")
    print("=" * 60)
    
    # Run OCR
    result = ocr_pipeline.extract_text_from_card(
        image, 
        preprocess=True,
        save_roi_path='./ocr_test_results/roi_test.jpg'  # Save ROI for inspection
    )
    
    print("\n" + "=" * 60)
    print("OCR Results Summary")
    print("=" * 60)
    
    ocr_text = result.get('text', '').strip()
    ocr_confidence = result.get('confidence', 0.0)
    ocr_lines = result.get('lines', [])
    
    if ocr_text:
        print(f"✓ Card name detected: '{ocr_text}'")
        print(f"✓ Confidence: {ocr_confidence:.3f}")
        print(f"✓ Number of text lines: {len(ocr_lines)}")
        
        if ocr_lines:
            print("\nDetected text lines:")
            for i, line in enumerate(ocr_lines):
                line_text = line.get('text', '')
                line_conf = line.get('confidence', 0.0)
                print(f"  [{i+1}] '{line_text}' (confidence: {line_conf:.3f})")
    else:
        print("✗ No text detected")
    
    print("\n" + "=" * 60)
    print("ROI image saved to: ./ocr_test_results/roi_test.jpg")
    print("=" * 60)

if __name__ == "__main__":
    main()

