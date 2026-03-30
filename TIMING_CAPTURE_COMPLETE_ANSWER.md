# ANSWER: How to Capture Timing Data

## Quick Answer

**You DO NOT need a special script. Timing is captured AUTOMATICALLY during normal training.**

```bash
# Just run training normally - timing is captured automatically!
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# model_timing.txt is created automatically after training
# No special script needed!
```

---

## Complete Flow

### Phase 1: Modify C++ Code (Once)

Add timing instrumentation to NNTrainer:

**File: network_graph.h**
```cpp
private:
  struct LayerTiming {
    std::string layer_name;
    double total_time_ms = 0.0;
    double forward_time_ms = 0.0;
    // ... more fields
  };
  std::map<std::string, LayerTiming> layer_timings;
  void saveTimingData(const std::string& filepath);
```

**File: network_graph.cpp**
```cpp
// Add at top:
#include <chrono>
#include <fstream>

// In forwarding() method - wrap with timing:
auto start_time = std::chrono::high_resolution_clock::now();
forwarding_op(*iter, training);
auto end_time = std::chrono::high_resolution_clock::now();
auto duration = std::chrono::duration<double, std::milli>(end_time - start_time);
layer_timings[layer_name].forward_time_ms += duration.count();

// Add method at end:
void NetworkGraph::saveTimingData(const std::string& filepath) {
  std::ofstream timing_file(filepath);
  for (const auto& [name, timing] : layer_timings) {
    timing_file << name << " " << timing.type << " " 
                << timing.total_time_ms << "\n";
  }
}

// In training code - call after model save:
network_graph->saveTimingData("model_timing.txt");
```

**See:** `CPP_MODIFICATIONS_DETAILED.md` for exact locations

---

### Phase 2: Rebuild NNTrainer (Once)

```bash
cd /storage_data/Snap/nntrainer

meson setup build --prefix=$NNTRAINER_ROOT \
  -Denable-nnstreamer=false \
  -Denable-profile=true

ninja -C build
ninja -C build install
```

---

### Phase 3: Run Training (Every Time)

**NO SPECIAL SCRIPT - JUST RUN NORMALLY:**

```bash
# This is how you normally run NNTrainer:
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# After training completes:
# ✓ model.bin (weights)
# ✓ model.ini (architecture)
# ✓ model_timing.txt (timing) ← AUTOMATICALLY CREATED!
```

---

### Phase 4: View Timing Data

```bash
# Check it was created
ls -la model_timing.txt

# View contents
cat model_timing.txt

# Expected format:
# # NNTrainer Layer Execution Timing Data
# input Input 0.002 0.002 0 0
# conv2d_1 Conv2D 5.430 2.100 3.330 0
# conv2d_2 Conv2D 4.820 2.150 2.670 0
```

---

### Phase 5: Load in Visualizer

```bash
# Open VS Code with your project
code /storage_data/Snap/nntrainer

# Right-click model.ini
# Select "Visualize NNTrainer Model"

# In visualizer, click "Load Timing" button
# See timing data displayed with colors
```

---

## How It Works Behind the Scenes

```
┌─────────────────────────────────────────────────┐
│          Normal Training Run                     │
│  nntrainer Applications/MNIST/res/mnist.ini     │
└────────────────────┬────────────────────────────┘
                     │
                     ├─→ Epoch 1: Train layers
                     │   └─→ forwarding() is called
                     │       ├─→ std::chrono measures time
                     │       └─→ Results stored in layer_timings map
                     │
                     ├─→ Epoch 2, 3, ... : Continue
                     │   └─→ Time accumulates in layer_timings
                     │
                     └─→ Training Completes
                         └─→ saveTimingData() called automatically
                             └─→ model_timing.txt written to disk
                                 └─→ Ready for visualizer!
```

---

## Optional: Custom Scripts (If You Want Them)

If you want custom automation, 3 optional scripts are provided:

### Option 1: Simple Python Wrapper
```python
# run_training_with_timing.py
python run_training_with_timing.py model.ini ./results

# It will:
# 1. Run training
# 2. Check for model_timing.txt
# 3. Display the timing data
```

### Option 2: Bash Script
```bash
# run_training_with_timing.sh
./run_training_with_timing.sh Applications/MNIST/res/mnist.ini ./results
```

### Option 3: Advanced Python with Analysis
```python
# train_with_timing_monitoring.py
python train_with_timing_monitoring.py model.ini ./results

# It will:
# 1. Run training
# 2. Parse timing data
# 3. Show formatted summary
# 4. Save as JSON for analysis
# 5. Highlight bottleneck layer
```

**But these are OPTIONAL - normal training works fine without them!**

---

## Timing Data Format

### Text File Format (model_timing.txt)

```
# NNTrainer Layer Execution Timing Data
# Format: layer_name layer_type total_time(ms) forward(ms) backward(ms) weight_update(ms)
#
input Input 0.002 0.002 0 0
conv2d_1 Conv2D 5.430 2.100 3.330 0
conv2d_2 Conv2D 4.820 2.150 2.670 0
flatten Flatten 0.150 0.150 0 0
dense Dense 2.100 1.000 1.100 0
softmax Activation 0.035 0.035 0 0
```

### What Each Column Means

- **layer_name**: Name of the layer (from .ini)
- **layer_type**: Type of layer (Conv2D, Dense, etc.)
- **total_time_ms**: Total execution time in milliseconds
- **forward_ms**: Time for forward pass
- **backward_ms**: Time for backward pass (gradient computation)
- **weight_update_ms**: Time for parameter update

---

## Key Facts

✅ **Automatic** - No separate script needed
✅ **Built-in** - Part of the training process
✅ **Efficient** - Uses high-resolution timer (std::chrono)
✅ **Accurate** - Measures actual layer execution time
✅ **Simple** - Just add C++ code, rebuild, run normally

---

## Common Scenarios

### Scenario 1: I want timing data quickly
```bash
# Apply C++ changes
# Rebuild NNTrainer
# Run training
$NNTRAINER_ROOT/bin/nntrainer model.ini
# Done! model_timing.txt created
```

### Scenario 2: I want to test multiple times
```bash
# Training 1:
$NNTRAINER_ROOT/bin/nntrainer model1.ini
cp model_timing.txt results/model1_timing.txt

# Training 2:
$NNTRAINER_ROOT/bin/nntrainer model2.ini
cp model_timing.txt results/model2_timing.txt

# Now you have timing for multiple models
```

### Scenario 3: I want automated monitoring
```bash
# Use the Python monitoring script:
python train_with_timing_monitoring.py model.ini ./results

# It handles everything:
# - Runs training
# - Captures timing
# - Shows formatted summary
# - Saves JSON analysis
```

### Scenario 4: I want to compare performance
```bash
# Run multiple trainings
for model in model1.ini model2.ini model3.ini; do
  $NNTRAINER_ROOT/bin/nntrainer $model
  cp model_timing.txt results/$(basename $model .ini)_timing.txt
done

# Now compare the timing files
```

---

## Verification

After applying C++ changes and rebuilding:

```bash
# Step 1: Train
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# Step 2: Verify file created
ls -la model_timing.txt
# Should show the file exists

# Step 3: Check contents
cat model_timing.txt
# Should show timing data for each layer

# Step 4: Load in visualizer
# Right-click model.ini → Visualize
# Click "Load Timing" button
# See data displayed ✓
```

---

## Troubleshooting

### Problem: model_timing.txt not created

**Cause:** `saveTimingData()` not being called
**Fix:** Check that you added the call after model->save() in training code

```cpp
// This should be in your training code:
model->save("model.bin", MODEL_FORMAT_BIN);
model->save("model.ini", MODEL_FORMAT_INI);
network_graph->saveTimingData("model_timing.txt");  // ← Must add this
```

### Problem: Compilation error: "chrono not found"

**Cause:** Missing #include
**Fix:** Add to network_graph.cpp:
```cpp
#include <chrono>
#include <fstream>
#include <iomanip>
```

### Problem: Timing values are 0 or very small

**Possible Causes:**
- Layers execute very fast
- Timing code not in the right place
- System timer not working

**Fix:** Check that timing code wraps the actual layer execution

---

## Files You Need for Timing Capture

1. **CPP_MODIFICATIONS_DETAILED.md** - Exact C++ changes
2. **CODE_SNIPPETS.md** - Code to copy/paste
3. **TIMING_CAPTURE_HOW_TO.md** - Detailed timing guide
4. **TIMING_CAPTURE_QUICK_REFERENCE.md** - Quick reference
5. Optional scripts (if you want custom automation)

---

## Summary

```
╔══════════════════════════════════════════════════════════╗
║           HOW TO CAPTURE TIMING DATA                     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  1. Modify C++ code (network_graph.h/cpp)              ║
║     ├─ Add LayerTiming struct                          ║
║     ├─ Add timing code in forwarding()                 ║
║     └─ Add saveTimingData() method                     ║
║                                                          ║
║  2. Rebuild NNTrainer                                  ║
║     meson setup build && ninja -C build               ║
║                                                          ║
║  3. RUN TRAINING NORMALLY                              ║
║     $NNTRAINER_ROOT/bin/nntrainer model.ini           ║
║                                                          ║
║  4. model_timing.txt created automatically! ✓          ║
║                                                          ║
║  NO SPECIAL SCRIPT NEEDED!                            ║
║  Timing happens automatically in the background.       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## Next Steps

1. ✅ Read `CPP_MODIFICATIONS_DETAILED.md` - Know exactly where to put C++ code
2. ✅ Apply C++ changes to network_graph.h and network_graph.cpp
3. ✅ Rebuild NNTrainer
4. ✅ Run training: `$NNTRAINER_ROOT/bin/nntrainer model.ini`
5. ✅ Verify `model_timing.txt` created
6. ✅ Load in visualizer

Done! 🎉

---
