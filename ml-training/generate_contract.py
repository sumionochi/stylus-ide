"""
Generate a Stylus contract with embedded ML weights
WARNING: This creates a LARGE contract file (not recommended for production)
"""

import json

# Load weights
with open('../frontend/public/ml-weights/model_weights.json', 'r') as f:
    weights = json.load(f)

print("Generating Stylus ML contract with embedded weights...")
print(f"Total parameters: {len(weights['input_hidden']) * len(weights['input_hidden'][0]) + len(weights['bias_hidden']) + len(weights['hidden_output']) * len(weights['hidden_output'][0]) + len(weights['bias_output'])}")

# Note: Embedding 25k+ weights in a contract is NOT practical for production
# This is for educational purposes only
print("\n⚠️  WARNING: Embedding weights on-chain is extremely gas-inefficient!")
print("Production approach: Use off-chain computation with zero-knowledge proofs")
print("\nFor this demo, we use a simplified contract with hardcoded biases only.")