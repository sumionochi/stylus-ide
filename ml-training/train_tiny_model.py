"""
Train a TINY neural network that can be embedded on-chain
Architecture: 784 -> 10 -> 10 (only ~8K parameters)
Trade-off: Lower accuracy but actually deployable
"""

import numpy as np
from sklearn.datasets import fetch_openml
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
import json

# TINY configuration for on-chain deployment
HIDDEN_LAYER_SIZE = 10  # Very small to reduce weights
INPUT_SIZE = 784
OUTPUT_SIZE = 10
FIXED_POINT_SCALE = 10000

print("Loading MNIST dataset...")
mnist = fetch_openml('mnist_784', version=1, parser='auto')
X, y = mnist.data, mnist.target

X = X.to_numpy() if hasattr(X, 'to_numpy') else X
y = y.to_numpy() if hasattr(y, 'to_numpy') else y
y = y.astype(int)

# Use more data for better accuracy
X = X[:30000]
y = y[:30000]

# Normalize
X = X / 255.0

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"Training TINY model: {INPUT_SIZE} -> {HIDDEN_LAYER_SIZE} -> {OUTPUT_SIZE}")
print(f"Training set: {X_train.shape[0]} samples")
print(f"Test set: {X_test.shape[0]} samples")

# Train model
model = MLPClassifier(
    hidden_layer_sizes=(HIDDEN_LAYER_SIZE,),
    activation='relu',
    solver='adam',
    max_iter=100,
    random_state=42,
    verbose=True
)

model.fit(X_train, y_train)

train_score = model.score(X_train, y_train)
test_score = model.score(X_test, y_test)

print(f"\nTraining accuracy: {train_score:.4f}")
print(f"Test accuracy: {test_score:.4f}")

# Extract weights
w1 = model.coefs_[0]  # (784, 10)
b1 = model.intercepts_[0]  # (10,)
w2 = model.coefs_[1]  # (10, 10)
b2 = model.intercepts_[1]  # (10,)

print(f"\nTotal parameters: {w1.size + b1.size + w2.size + b2.size}")

# Convert to fixed-point
def to_fixed(arr):
    return np.round(arr * FIXED_POINT_SCALE).astype(np.int32)

w1_fp = to_fixed(w1)
b1_fp = to_fixed(b1)
w2_fp = to_fixed(w2)
b2_fp = to_fixed(b2)

print("\nGenerating Rust contract code...")

# Generate Rust arrays as strings
def format_rust_array_2d(arr, name):
    """Format 2D array as Rust const"""
    rows, cols = arr.shape
    lines = [f"const {name}: [[i64; {cols}]; {rows}] = ["]
    for row in arr:
        row_str = "    [" + ", ".join(str(int(x)) for x in row) + "],"
        lines.append(row_str)
    lines.append("];")
    return "\n".join(lines)

def format_rust_array_1d(arr, name):
    """Format 1D array as Rust const"""
    size = len(arr)
    values = ", ".join(str(int(x)) for x in arr)
    return f"const {name}: [i64; {size}] = [{values}];"

# Generate contract with embedded weights
contract_code = f"""// REAL ML Inference - MNIST (Tiny Model)
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{{alloy_primitives::U256, prelude::*, alloy_sol_types::sol}};
use alloc::vec::Vec;

const INPUT_SIZE: usize = {INPUT_SIZE};
const HIDDEN_SIZE: usize = {HIDDEN_LAYER_SIZE};
const OUTPUT_SIZE: usize = {OUTPUT_SIZE};
const SCALE: i64 = {FIXED_POINT_SCALE};

// TRAINED WEIGHTS (Fixed-point scaled by {FIXED_POINT_SCALE})
// Model accuracy: {test_score:.2%}

{format_rust_array_2d(w1_fp, "WEIGHTS_INPUT_HIDDEN")}

{format_rust_array_1d(b1_fp, "BIAS_HIDDEN")}

{format_rust_array_2d(w2_fp, "WEIGHTS_HIDDEN_OUTPUT")}

{format_rust_array_1d(b2_fp, "BIAS_OUTPUT")}

sol_storage! {{
    #[entrypoint]
    pub struct MNISTClassifier {{
        bool initialized;
    }}
}}

#[public]
impl MNISTClassifier {{
    // Predict digit from 28x28 grayscale image (784 pixels, 0-255)
    pub fn predict(&self, pixels: Vec<u8>) -> U256 {{
        if pixels.len() != INPUT_SIZE {{
            return U256::from(999); // Error code
        }}

        // Normalize pixels to fixed-point (0-10000 range)
        let mut input: Vec<i64> = pixels.iter()
            .map(|&p| ((p as i64) * SCALE) / 255)
            .collect();

        // Layer 1: Input -> Hidden (ReLU)
        let mut hidden = Vec::with_capacity(HIDDEN_SIZE);
        for i in 0..HIDDEN_SIZE {{
            let mut sum = BIAS_HIDDEN[i];
            
            // Dot product with input
            for j in 0..INPUT_SIZE {{
                let weight = WEIGHTS_INPUT_HIDDEN[j][i];
                sum += (input[j] * weight) / SCALE;
            }}
            
            hidden.push(relu(sum));
        }}

        // Layer 2: Hidden -> Output
        let mut output = Vec::with_capacity(OUTPUT_SIZE);
        for i in 0..OUTPUT_SIZE {{
            let mut sum = BIAS_OUTPUT[i];
            
            // Dot product with hidden layer
            for j in 0..HIDDEN_SIZE {{
                let weight = WEIGHTS_HIDDEN_OUTPUT[j][i];
                sum += (hidden[j] * weight) / SCALE;
            }}
            
            output.push(sum);
        }}

        // Return argmax (predicted digit)
        let mut max_idx = 0;
        let mut max_val = output[0];
        
        for i in 1..OUTPUT_SIZE {{
            if output[i] > max_val {{
                max_val = output[i];
                max_idx = i;
            }}
        }}

        U256::from(max_idx)
    }}
    
    // Get model info
    pub fn get_model_info(&self) -> (U256, U256, U256) {{
        (
            U256::from(INPUT_SIZE),
            U256::from(HIDDEN_SIZE),
            U256::from(OUTPUT_SIZE)
        )
    }}
    
    // Always ready (weights are embedded)
    pub fn is_ready(&self) -> bool {{
        true
    }}
}}

// ReLU activation
fn relu(x: i64) -> i64 {{
    if x > 0 {{ x }} else {{ 0 }}
}}
"""

# Save contract
with open('../frontend/lib/ml-contract-template.txt', 'w') as f:
    f.write(contract_code)

print(f"\n✓ Contract saved to: frontend/lib/ml-contract-template.txt")
print(f"✓ Model achieves {test_score:.2%} accuracy")
print(f"✓ Total parameters: {w1.size + b1.size + w2.size + b2.size}")
print(f"\nNote: Accuracy is lower due to tiny model size")
print(f"Trade-off: {test_score:.0%} accuracy vs deployable on-chain")

# Save test samples for demo
print("\nSaving test samples...")

# Get 10 correctly classified samples (one per digit)
test_samples_by_digit = {i: [] for i in range(10)}

# Find examples of each digit
for i in range(len(X_test)):
    label = y_test[i]
    prediction = model.predict([X_test[i]])[0]
    
    # Only save if correctly predicted
    if prediction == label and len(test_samples_by_digit[label]) < 2:
        test_samples_by_digit[label].append({
            'image': X_test[i].tolist(),
            'label': int(label),
            'index': i
        })
    
    # Stop when we have 2 examples of each digit
    if all(len(samples) >= 2 for samples in test_samples_by_digit.values()):
        break

# Use the first example of each digit
test_samples = {
    'images': [test_samples_by_digit[i][0]['image'] for i in range(10)],
    'labels': [i for i in range(10)],
    'indices': [test_samples_by_digit[i][0]['index'] for i in range(10)]
}

import os
os.makedirs('../frontend/public/ml-weights', exist_ok=True)

with open('../frontend/public/ml-weights/test_samples.json', 'w') as f:
    json.dump(test_samples, f, indent=2)

print("✓ Test samples saved (correctly classified examples)")

# Print verification info
print("\nTest sample verification:")
for i in range(10):
    img = test_samples['images'][i]
    label = test_samples['labels'][i]
    pred = model.predict([img])[0]
    print(f"  Sample #{i}: Label={label}, Prediction={pred}, {'✓' if pred == label else '✗'}")