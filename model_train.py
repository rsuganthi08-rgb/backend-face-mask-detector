import numpy as np
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
import joblib
import os

# Function to generate simple synthetic data for face mask detection
# In a real project, you would load images from a directory
# Here we simulate feature vectors (flattened 28x28 grayscale images)
def generate_synthetic_data(num_samples=500):
    np.random.seed(42)
    # 784 features per "image" (28*28)
    # Masked: More "blue/light" values in the bottom half
    # Unmasked: More "skin-tone" values in the center
    X = np.random.rand(num_samples, 784)
    y = np.zeros(num_samples)
    
    for i in range(num_samples):
        if i < num_samples // 2:
            # Class 1: Masked (simulated)
            # Add features that represent a mask pattern
            X[i, 400:] += 0.5 
            y[i] = 1
        else:
            # Class 0: Unmasked (simulated)
            X[i, 200:400] += 0.3
            y[i] = 0
            
    return X, y

def train_model():
    print("Generating training data...")
    X, y = generate_synthetic_data()
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training scikit-learn SVM model...")
    # Using a simple Support Vector Classifier
    model = SVC(probability=True, kernel='linear')
    model.fit(X_train, y_train)
    
    # Calculate accuracy
    accuracy = model.score(X_test, y_test)
    print(f"Model Accuracy: {accuracy * 100:.2f}%")
    
    # Save the model
    joblib.dump(model, 'model.pkl')
    print("Model saved as model.pkl")
    return accuracy

if __name__ == "__main__":
    train_model()
