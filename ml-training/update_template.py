"""
Helper script to update the ML template in templates.ts
Usage: python update_template.py
"""

import re
import sys

def update_ml_template():
    try:
        # Read the generated contract
        with open('../frontend/lib/ml-contract-template.txt', 'r') as f:
            contract_code = f.read()
        
        # Read templates.ts
        templates_path = '../frontend/lib/templates.ts'
        with open(templates_path, 'r') as f:
            content = f.read()
        
        # Use regex to find and replace the ML template code
        # Pattern: finds the ml-inference template and its code section
        pattern = r"(id: 'ml-inference',\s+name: 'ML Inference \(MNIST\)',\s+description: '[^']+',\s+code: `)([^`]+)(`)"
        
        # Escape backticks in contract code
        escaped_contract = contract_code.replace('`', '\\`')
        
        # Replace
        new_content = re.sub(
            pattern,
            r'\1' + escaped_contract + r'\3',
            content,
            flags=re.DOTALL
        )
        
        if new_content != content:
            # Write back
            with open(templates_path, 'w') as f:
                f.write(new_content)
            
            print("✓ templates.ts updated successfully!")
            print("✓ ML template now has real trained weights")
            print("\n🎉 Refresh your IDE to see the changes!")
            return True
        else:
            print("⚠️  No changes made - pattern not found")
            print("Check that ml-inference template exists in templates.ts")
            return False
            
    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        print("Make sure you run this from the ml-training directory")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    success = update_ml_template()
    sys.exit(0 if success else 1)