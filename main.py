from ultralytics import YOLO
from PIL import Image
import cv2
import os

model = YOLO('./best.pt')



def folder():
    image_folder = './test_images'
    for filename in os.listdir(image_folder):
        if filename.lower().endswith(('.jpg')):
            image_path = os.path.join(image_folder, filename)
            image = cv2.imread(image_path)

            results = model(image)

            result_img = results[0].plot()
            os.makedirs('predictions', exist_ok=True)
            save_path = os.path.join('predictions', filename)
            cv2.imwrite(save_path, result_img)



def singleImage():
    
    image_path = './images/20250430_124524.jpg'
    image = cv2.imread(image_path)
    pred = model(image)
    cards = []
    for result in pred: 
        for box in result.boxes:
            if box.conf[0] > 0.85:
                cards.append(box)
                x,y,x2,y2 = map(int, box.xyxy[0].tolist())
                confidence = box.conf[0]    
                label = model.names[int(box.cls[0])]

                print(f'BOUNDING BOX coordinates (bottom left -> top right): ({x}, {y}) to ({x2}, {y2})')
                print(f'label: {label} with confidence {confidence:.2f}')

    # cv2.imshow("Detections", pred[0].plot())
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    pred[0].save('pred.jpg')

if __name__ == '__main__':
    folder()
    # singleImage()

    metrics = model.val(data='./data.yaml')

    print(f"mAP50-95: {metrics.box.map:.3f}")    
    print(f"mAP50: {metrics.box.map50:.3f}") 
    print(f"Recall: {metrics.box.mr:.3f}")
