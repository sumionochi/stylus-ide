# ML Model Training for Stylus

This directory contains scripts to train a neural network and export weights for on-chain inference.

## Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
python -m pip install -U pip
python -m pip install numpy scikit-learn pandas
```

## Train Model

```bash
python train_model.py
```

This will:

1. Download MNIST dataset (28x28 digit images)
2. Train a simple neural network (784 → 32 → 10)
3. Convert weights to fixed-point format
4. Export to `frontend/public/ml-weights/model_weights.json`
5. Save test samples for demo

## Architecture

**Input Layer:** 784 neurons (28×28 pixels, normalized 0-1)
**Hidden Layer:** 32 neurons (ReLU activation)
**Output Layer:** 10 neurons (digit 0-9)

**Fixed-Point Format:**

- All weights/biases multiplied by 10,000
- Stored as i32 in Stylus
- Divided by 10,000 during inference

## Why Fixed-Point?

Stylus (like EVM) doesn't support floating-point. We use fixed-point arithmetic:

- Float: `0.1234` → Fixed: `1234` (scale: 10000)
- Multiply: `(a * b) / SCALE`
- Accurate enough for simple ML
- Much cheaper than float emulation

## Model Stats

- **Parameters:** ~25,000 weights
- **Accuracy:** ~95% on MNIST test set
- **Gas Cost:** TBD (will measure on-chain)
