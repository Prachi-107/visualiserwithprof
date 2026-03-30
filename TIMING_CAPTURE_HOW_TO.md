# How to Capture Timing Data from NNTrainer

## Quick Answer

**After you apply the C++ changes, timing data is captured AUTOMATICALLY during normal training.**

You don't need a separate script - the timing is built into the training process.

---

## How It Works

### Automatic Timing Capture

Once you've added the C++ instrumentation:

```bash
# NORMAL TRAINING - timing is captured automatically!
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# This creates:
# ✓ model.bin       (weights)
# ✓ model.ini       (architecture) 
# ✓ model_timing.txt (timing data) ← AUTOMATICALLY CREATED
```

The timing happens inside the training loop:
- Every time a layer executes, time is measured
- Data is stored in memory
- After training completes, `saveTimingData()` writes `model_timing.txt`

---

## Step 1: Apply C++ Changes

First, apply the modifications from `CPP_MODIFICATIONS_DETAILED.md`:

1. **network_graph.h** - Add timing struct
2. **network_graph.cpp** - Add timing code
3. **Training code** - Call `saveTimingData()` after training

```cpp
// In your training code (e.g., after model->save()):
model->save("model.bin", MODEL_FORMAT_BIN);
model->save("model.ini", MODEL_FORMAT_INI);

// ADD THIS LINE:
network_graph->saveTimingData("model_timing.txt");
```

---

## Step 2: Rebuild NNTrainer

```bash
cd /storage_data/Snap/nntrainer

# Setup with meson
meson setup build --prefix=$NNTRAINER_ROOT \
  -Denable-nnstreamer=false \
  -Denable-profile=true

# Build
ninja -C build

# Install
ninja -C build install
```

**Important:** The `-Denable-profile=true` option ensures timing is enabled.

---

## Step 3: Run Training (Timing Captured Automatically)

```bash
# Just run training normally
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# OR with your model
$NNTRAINER_ROOT/bin/nntrainer /path/to/your/model.ini
```

The `saveTimingData()` call runs automatically after training completes.

---

## Step 4: Check the Timing File

```bash
# Verify timing file was created
ls -la model_timing.txt

# View the timing data
cat model_timing.txt

# Expected output:
# # NNTrainer Layer Execution Timing Data
# # Format: layer_name layer_type total_time(ms) forward(ms) backward(ms) weight_update(ms)
# #
# input Input 0.002 0.002 0 0
# conv2d_1 Conv2D 5.430 2.100 3.330 0
# conv2d_2 Conv2D 4.820 2.150 2.670 0
# flatten Flatten 0.150 0.150 0 0
```

---

## Optional: Custom Training Script

If you want to customize when timing data is saved, you can create a training script:

### Example: Python Training Script with NNTrainer

**File: `run_training_with_timing.py`**

```python
#!/usr/bin/env python3
"""
Custom training script that ensures timing data is saved
"""

import subprocess
import os
import sys

def run_training(ini_file, output_dir="."):
    """
    Run NNTrainer with timing capture
    
    Args:
        ini_file: Path to model.ini file
        output_dir: Where to save model_timing.txt (default: current dir)
    """
    
    # Get NNTrainer path from environment
    nntrainer_root = os.environ.get('NNTRAINER_ROOT')
    if not nntrainer_root:
        print("ERROR: NNTRAINER_ROOT environment variable not set")
        print("Set it with: export NNTRAINER_ROOT=/path/to/nntrainer/build")
        sys.exit(1)
    
    nntrainer_bin = os.path.join(nntrainer_root, 'bin', 'nntrainer')
    
    if not os.path.exists(nntrainer_bin):
        print(f"ERROR: NNTrainer binary not found at {nntrainer_bin}")
        sys.exit(1)
    
    if not os.path.exists(ini_file):
        print(f"ERROR: Model file not found at {ini_file}")
        sys.exit(1)
    
    print(f"Starting training with {ini_file}")
    print(f"Output directory: {output_dir}")
    
    # Run training
    try:
        result = subprocess.run(
            [nntrainer_bin, ini_file],
            cwd=output_dir,
            check=True
        )
        
        # Check if timing file was created
        timing_file = os.path.join(output_dir, 'model_timing.txt')
        if os.path.exists(timing_file):
            print(f"\n✓ Training completed successfully!")
            print(f"✓ Timing data saved to: {timing_file}")
            
            # Show timing data
            print("\n=== TIMING DATA ===")
            with open(timing_file, 'r') as f:
                print(f.read())
        else:
            print("\n⚠ Training completed but timing file not found!")
            print(f"  Expected: {timing_file}")
            print("  Make sure saveTimingData() was called in your training code")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"✗ Training failed with error code {e.returncode}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_training_with_timing.py <model.ini> [output_dir]")
        print("\nExample:")
        print("  python run_training_with_timing.py model.ini ./results")
        sys.exit(1)
    
    model_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    
    success = run_training(model_file, output_dir)
    sys.exit(0 if success else 1)
```

**Usage:**

```bash
# Make executable
chmod +x run_training_with_timing.py

# Run training
python run_training_with_timing.py Applications/MNIST/res/mnist.ini ./results

# It will:
# 1. Run training
# 2. Check if model_timing.txt was created
# 3. Display the timing data
```

---

## Optional: Bash Training Script

**File: `run_training_with_timing.sh`**

```bash
#!/bin/bash

# Training script that captures and displays timing data

set -e  # Exit on error

# Check environment
if [ -z "$NNTRAINER_ROOT" ]; then
    echo "ERROR: NNTRAINER_ROOT not set"
    echo "Run: export NNTRAINER_ROOT=/path/to/nntrainer/build"
    exit 1
fi

if [ $# -lt 1 ]; then
    echo "Usage: $0 <model.ini> [output_dir]"
    echo ""
    echo "Example:"
    echo "  $0 Applications/MNIST/res/mnist.ini ./results"
    exit 1
fi

MODEL_FILE="$1"
OUTPUT_DIR="${2:-.}"

if [ ! -f "$MODEL_FILE" ]; then
    echo "ERROR: Model file not found: $MODEL_FILE"
    exit 1
fi

echo "=========================================="
echo "NNTrainer Training with Timing Capture"
echo "=========================================="
echo "Model:       $MODEL_FILE"
echo "Output Dir: $OUTPUT_DIR"
echo "NNTrainer:   $NNTRAINER_ROOT"
echo "=========================================="

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run training
cd "$OUTPUT_DIR"

echo ""
echo "Starting training..."
echo ""

$NNTRAINER_ROOT/bin/nntrainer "$MODEL_FILE"

# Check if timing file was created
if [ -f "model_timing.txt" ]; then
    echo ""
    echo "=========================================="
    echo "✓ Training completed successfully!"
    echo "=========================================="
    echo ""
    echo "=== TIMING DATA ==="
    echo ""
    cat model_timing.txt
    echo ""
    echo "=========================================="
else
    echo ""
    echo "⚠ WARNING: Timing file not created!"
    echo "  Expected: model_timing.txt"
    echo "  Make sure saveTimingData() was called"
    exit 1
fi
```

**Usage:**

```bash
# Make executable
chmod +x run_training_with_timing.sh

# Run training
./run_training_with_timing.sh Applications/MNIST/res/mnist.ini ./results

# It will automatically show the timing data
```

---

## Optional: Advanced Python Script with Monitoring

**File: `train_with_timing_monitoring.py`**

```python
#!/usr/bin/env python3
"""
Advanced training script with real-time monitoring and timing analysis
"""

import subprocess
import os
import sys
import json
from pathlib import Path
from datetime import datetime

class TimingMonitor:
    def __init__(self, ini_file, output_dir="."):
        self.ini_file = ini_file
        self.output_dir = Path(output_dir)
        self.timing_file = self.output_dir / "model_timing.txt"
        self.nntrainer_root = os.environ.get('NNTRAINER_ROOT')
        
    def validate_setup(self):
        """Check if everything is ready"""
        if not self.nntrainer_root:
            raise Exception("NNTRAINER_ROOT environment variable not set")
        
        nntrainer_bin = Path(self.nntrainer_root) / 'bin' / 'nntrainer'
        if not nntrainer_bin.exists():
            raise Exception(f"NNTrainer binary not found at {nntrainer_bin}")
        
        if not Path(self.ini_file).exists():
            raise Exception(f"Model file not found at {self.ini_file}")
        
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def run_training(self):
        """Execute training"""
        nntrainer_bin = Path(self.nntrainer_root) / 'bin' / 'nntrainer'
        
        print(f"Starting training at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        result = subprocess.run(
            [str(nntrainer_bin), self.ini_file],
            cwd=str(self.output_dir),
            capture_output=False
        )
        
        return result.returncode == 0
    
    def parse_timing_file(self):
        """Parse and analyze timing data"""
        if not self.timing_file.exists():
            print("⚠ Timing file not found!")
            return None
        
        layers = []
        total_time = 0
        
        with open(self.timing_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith('#') or not line:
                    continue
                
                parts = line.split()
                if len(parts) >= 5:
                    layer_data = {
                        'name': parts[0],
                        'type': parts[1],
                        'total_ms': float(parts[2]),
                        'forward_ms': float(parts[3]),
                        'backward_ms': float(parts[4]),
                        'update_ms': float(parts[5]) if len(parts) > 5 else 0
                    }
                    layers.append(layer_data)
                    total_time += layer_data['total_ms']
        
        return {
            'layers': layers,
            'total_time_ms': total_time,
            'num_layers': len(layers)
        }
    
    def print_timing_summary(self, timing_data):
        """Print formatted timing summary"""
        if not timing_data:
            return
        
        print("\n" + "="*70)
        print("TIMING SUMMARY")
        print("="*70)
        print(f"Total Execution Time: {timing_data['total_time_ms']:.4f} ms")
        print(f"Number of Layers:     {timing_data['num_layers']}")
        print("="*70)
        
        print("\nPer-Layer Breakdown:")
        print("-"*70)
        print(f"{'Layer Name':<20} {'Type':<15} {'Total (ms)':<15} {'Forward %':<15}")
        print("-"*70)
        
        for layer in timing_data['layers']:
            forward_pct = (layer['forward_ms'] / layer['total_ms'] * 100) if layer['total_ms'] > 0 else 0
            print(f"{layer['name']:<20} {layer['type']:<15} {layer['total_ms']:<15.4f} {forward_pct:<15.1f}%")
        
        print("-"*70)
        
        # Find bottleneck
        slowest = max(timing_data['layers'], key=lambda x: x['total_ms'])
        print(f"\nBottleneck Layer: {slowest['name']} ({slowest['total_ms']:.4f} ms)")
        
        print("="*70 + "\n")
    
    def run(self):
        """Run complete training and analysis"""
        try:
            self.validate_setup()
            print("✓ Setup validated")
            
            success = self.run_training()
            if not success:
                print("✗ Training failed")
                return False
            
            print("✓ Training completed")
            
            timing_data = self.parse_timing_file()
            if timing_data:
                self.print_timing_summary(timing_data)
                
                # Save as JSON for further analysis
                json_file = self.output_dir / "timing_analysis.json"
                with open(json_file, 'w') as f:
                    json.dump(timing_data, f, indent=2)
                print(f"✓ Timing analysis saved to {json_file}")
            
            return True
            
        except Exception as e:
            print(f"✗ Error: {e}")
            return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python train_with_timing_monitoring.py <model.ini> [output_dir]")
        sys.exit(1)
    
    model_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    
    monitor = TimingMonitor(model_file, output_dir)
    success = monitor.run()
    
    sys.exit(0 if success else 1)
```

**Usage:**

```bash
python train_with_timing_monitoring.py Applications/MNIST/res/mnist.ini ./results

# Output shows:
# ✓ Setup validated
# ✓ Training completed
#
# ======================================================================
# TIMING SUMMARY
# ======================================================================
# Total Execution Time: 12.537 ms
# Number of Layers:     6
# ======================================================================
#
# Per-Layer Breakdown:
# ...
# Bottleneck Layer: conv2d_1 (5.430 ms)
```

---

## Summary

### No Special Script Needed - It's Automatic!

**The timing is captured automatically** when you:
1. ✅ Apply C++ changes
2. ✅ Rebuild NNTrainer
3. ✅ Run training normally
4. ✅ `model_timing.txt` is created automatically

### Optional Scripts

If you want custom automation, use one of the scripts above:

- **Python simple** - Just wraps training and shows results
- **Bash simple** - Shell script version
- **Python advanced** - Includes real-time monitoring and JSON export

---

## Testing the Timing Capture

```bash
# Step 1: Apply C++ changes and rebuild
cd /storage_data/Snap/nntrainer
meson setup build --prefix=$NNTRAINER_ROOT -Denable-profile=true
ninja -C build
ninja -C build install

# Step 2: Run training
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# Step 3: Check timing file
ls -la model_timing.txt
cat model_timing.txt

# That's it! No special script needed.
```

---

## Key Points

✅ **Automatic** - Timing runs during normal training
✅ **No Script Required** - Works with standard NNTrainer commands
✅ **Optional Scripts** - Use if you want custom monitoring
✅ **Output** - `model_timing.txt` created automatically
✅ **Ready for Visualizer** - Load directly into VS Code extension

---
