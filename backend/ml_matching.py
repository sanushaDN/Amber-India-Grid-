import cv2
from deepface import DeepFace
import os

def calculate_match_score(img1_path: str, img2_path: str) -> float:
    """
    Compares two faces and returns a confidence percentage.
    Uses Facenet512 for higher accuracy.
    """
    if not os.path.exists(img1_path) or not os.path.exists(img2_path):
        return 0.0

    try:
        # Deepface verify returns a dictionary containing verified boolean and distances
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name="Facenet512",
            distance_metric="cosine",
            enforce_detection=False # Avoid crashing if photo is blurry/dark
        )
        
        distance = result.get("distance", 1.0)
        # Convert cosine distance to a percentage score
        confidence = max(0.0, (1.0 - distance) * 100)
        
        return round(confidence, 2)
    except Exception as e:
        print(f"Error during face match computation: {str(e)}")
        return 0.0
