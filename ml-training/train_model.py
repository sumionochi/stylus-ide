"""
Train a simple neural network for MNIST digit classification
Export weights in fixed-point format for Stylus
"""

import numpy as np
from sklearn.datasets import fetch_openml
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import json
import pickle
import os

# Configuration
HIDDEN_LAYER_SIZE = 32  # Small network for on-chain inference
INPUT_SIZE = 784  # 28x28 pixels
OUTPUT_SIZE = 10  # 10 digits (0-9)
FIXED_POINT_SCALE = 10000  # Scale factor for fixed-point arithmetic

print("Loading MNIST dataset...")
# Load MNIST data
mnist = fetch_openml('mnist_784', version=1, parser='auto')
X, y = mnist.data, mnist.target

# Convert to numpy arrays and normalize
X = X.to_numpy() if hasattr(X, 'to_numpy') else X
y = y.to_numpy() if hasattr(y, 'to_numpy') else y
y = y.astype(int)

# Use a small subset for faster training
X = X[:10000]
y = y[:10000]

# Normalize to [0, 1]
X = X / 255.0

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"Training set: {X_train.shape[0]} samples")
print(f"Test set: {X_test.shape[0]} samples")

print("\nTraining neural network...")
# Train a simple MLP
model = MLPClassifier(
    hidden_layer_sizes=(HIDDEN_LAYER_SIZE,),
    activation='relu',
    solver='adam',
    max_iter=50,
    random_state=42,
    verbose=True
)

model.fit(X_train, y_train)

# Evaluate
train_score = model.score(X_train, y_train)
test_score = model.score(X_test, y_test)

print(f"\nTraining accuracy: {train_score:.4f}")
print(f"Test accuracy: {test_score:.4f}")

# Extract weights and biases
weights_input_hidden = model.coefs_[0]  # Shape: (784, 32)
bias_hidden = model.intercepts_[0]      # Shape: (32,)
weights_hidden_output = model.coefs_[1] # Shape: (32, 10)
bias_output = model.intercepts_[1]      # Shape: (10,)

print("\nModel architecture:")
print(f"Input → Hidden: {weights_input_hidden.shape}")
print(f"Hidden bias: {bias_hidden.shape}")
print(f"Hidden → Output: {weights_hidden_output.shape}")
print(f"Output bias: {bias_output.shape}")

# Convert to fixed-point format for Stylus
def to_fixed_point(arr, scale=FIXED_POINT_SCALE):
    """Convert float array to fixed-point integers"""
    return np.round(arr * scale).astype(np.int32).tolist()

weights_fp = {
    'input_hidden': to_fixed_point(weights_input_hidden),
    'bias_hidden': to_fixed_point(bias_hidden),
    'hidden_output': to_fixed_point(weights_hidden_output),
    'bias_output': to_fixed_point(bias_output),
    'scale': FIXED_POINT_SCALE,
    'architecture': {
        'input_size': INPUT_SIZE,
        'hidden_size': HIDDEN_LAYER_SIZE,
        'output_size': OUTPUT_SIZE,
    },
    'accuracy': {
        'train': float(train_score),
        'test': float(test_score),
    }
}

# Create output directory
os.makedirs('../frontend/public/ml-weights', exist_ok=True)

# Save weights as JSON
with open('../frontend/public/ml-weights/model_weights.json', 'w') as f:
    json.dump(weights_fp, f, indent=2)

print(f"\n✓ Weights saved to: frontend/public/ml-weights/model_weights.json")

# Save full model for testing
with open('../frontend/public/ml-weights/model.pkl', 'wb') as f:
    pickle.dump(model, f)

print("✓ Full model saved for testing")

# Save test samples for demo
test_samples = {
    'images': X_test[:10].tolist(),
    'labels': y_test[:10].tolist()
}

with open('../frontend/public/ml-weights/test_samples.json', 'w') as f:
    json.dump(test_samples, f, indent=2)

print("✓ Test samples saved")

# Generate Rust code snippet for weights
print("\n" + "="*60)
print("Stylus Contract Weight Initialization:")
print("="*60)
print(f"""
// Fixed-point scale: {FIXED_POINT_SCALE}
// Architecture: {INPUT_SIZE} → {HIDDEN_LAYER_SIZE} → {OUTPUT_SIZE}
// Accuracy: {test_score:.2%}

const INPUT_SIZE: usize = {INPUT_SIZE};
const HIDDEN_SIZE: usize = {HIDDEN_LAYER_SIZE};
const OUTPUT_SIZE: usize = {OUTPUT_SIZE};
const SCALE: i32 = {FIXED_POINT_SCALE};

// Note: Weights will be loaded from JSON at deployment
// Total weight count: {weights_input_hidden.size + bias_hidden.size + weights_hidden_output.size + bias_output.size}
""")

print("\n✓ Training complete!")
print(f"✓ Model achieves {test_score:.2%} accuracy on test set")
print("\nNext: Run the Stylus contract generator to create the ML contract")