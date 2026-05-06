from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os
from fastapi.middleware.cors import CORSMiddleware
from model_train import train_model
from PIL import Image
import base64
import io

app = FastAPI(title="Face Mask Detector API")

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model on startup
model = None

@app.on_event("startup")
def load_model():
    global model
    if not os.path.exists("model.pkl"):
        print("Model not found. Training now...")
        train_model()
    
    try:
        model = joblib.load("model.pkl")
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")

class ImageData(BaseModel):
    image: str # Base64 encoded image

@app.post("/predict")
async def predict(data: ImageData):
    global model
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Decode base64 image
        header, encoded = data.image.split(",", 1) if "," in data.image else ("", data.image)
        image_data = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(image_data)).convert('L') # Convert to grayscale
        
        # Preprocess: Resize to 28x28 (same as training) and flatten
        img_resized = img.resize((28, 28))
        features = np.array(img_resized).flatten() / 255.0 # Normalize
        features = features.reshape(1, -1)
        
        # Predict
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]
        confidence = float(np.max(probabilities))
        
        result = "Mask detected" if prediction == 1 else "No mask detected"
        
        return {
            "prediction": result,
            "confidence": confidence,
            "class_id": int(prediction)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

if __name__ == "__main__":
    import uvicorn
    # Use port 3000 as required by the environment
    uvicorn.run(app, host="0.0.0.0", port=3000)
