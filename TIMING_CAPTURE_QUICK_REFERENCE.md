# Quick Reference: How to Capture Timing Data

## TL;DR - 5 Steps

### Step 1: Apply C++ Changes
```cpp
// In network_graph.h - add to private section:
struct LayerTiming { ... };
std::map<std::string, LayerTiming> layer_timings;
void saveTimingData(const std::string& filepath);

// In network_graph.cpp - add includes:
#include <chrono>
#include <fstream>
#include <iomanip>

// In network_graph.cpp - modify forwarding() and backwarding()
// Add timing code (see CPP_MODIFICATIONS_DETAILED.md)

// Add saveTimingData() method at end
```

### Step 2: Add Call to Training Code
```cpp
// After model->save() calls:
network_graph->saveTimingData("model_timing.txt");
```

### Step 3: Rebuild NNTrainer
```bash
cd /storage_data/Snap/nntrainer
meson setup build --prefix=$NNTRAINER_ROOT -Denable-profile=true
ninja -C build
ninja -C build install
```

### Step 4: Run Training (TIMING CAPTURED AUTOMATICALLY)
```bash
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# That's it! No special script needed.
# model_timing.txt is created automatically after training.
```

### Step 5: Load in Visualizer
```bash
# In VS Code:
1. Right-click model.ini
2. Select "Visualize NNTrainer Model"
3. Click "Load Timing" button
4. See timing data in panel
```

---

## Key Insight

**Timing is AUTOMATIC - you don't need a separate script!**

```
┌─────────────────────────────────┐
│  Normal Training Run             │
│  nntrainer model.ini             │
└──────────┬──────────────────────┘
           │
           ├─→ Runs forward/backward
           │
           ├─→ MEASURES execution time automatically
           │   (thanks to C++ instrumentation)
           │
           ├─→ Stores in layer_timings map
           │
           └─→ Calls saveTimingData() after training
               │
               └─→ Writes model_timing.txt
```

---

## If You Want Custom Scripts

### Option 1: Simple Python Wrapper (from TIMING_CAPTURE_HOW_TO.md)
```bash
python run_training_with_timing.py model.ini ./results
```

### Option 2: Simple Bash Wrapper
```bash
./run_training_with_timing.sh Applications/MNIST/res/mnist.ini
```

### Option 3: Advanced Python with Monitoring
```bash
python train_with_timing_monitoring.py model.ini ./results
# Shows real-time analysis and JSON export
```

**But these are OPTIONAL - normal training works fine!**

---

## Verification

After training, verify timing was captured:

```bash
# Check file exists
ls -la model_timing.txt

# View contents
cat model_timing.txt

# Expected output:
# # NNTrainer Layer Execution Timing Data
# input Input 0.002 0.002 0 0
# conv2d_1 Conv2D 5.430 2.100 3.330 0
# conv2d_2 Conv2D 4.820 2.150 2.670 0
```

---

## Common Questions

**Q: Do I need a special script to capture timing?**
A: No! Timing is captured automatically by the C++ code.

**Q: How does it work?**
A: The `forwarding()` and `backwarding()` methods measure time using `std::chrono`. After training, `saveTimingData()` writes the results.

**Q: When is the timing file created?**
A: After training completes, when `saveTimingData()` is called.

**Q: Can I see timing data in real-time during training?**
A: Not with this implementation. To do that, you'd need to stream data via WebSocket (advanced).

**Q: What if I train multiple times?**
A: Each training run overwrites `model_timing.txt`. If you want to keep multiple runs, copy the file before running again.

**Q: Do I need -Denable-profile=true?**
A: Recommended but not strictly required. It enables additional profiling features.

---

## Summary

```
╔════════════════════════════════════════════════════════╗
║         HOW TO CAPTURE TIMING DATA                     ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  1. Apply C++ changes (network_graph.h/cpp)           ║
║  2. Add saveTimingData() call in training code        ║
║  3. Rebuild: meson + ninja                           ║
║  4. Run training normally:                           ║
║     $NNTRAINER_ROOT/bin/nntrainer model.ini          ║
║  5. Check model_timing.txt created ✓                 ║
║  6. Load in visualizer                              ║
║                                                        ║
║  NO SPECIAL SCRIPT NEEDED - IT'S AUTOMATIC!          ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## Files You Need

- `CPP_MODIFICATIONS_DETAILED.md` - Exact C++ changes
- `CODE_SNIPPETS.md` - Code to copy/paste
- `TIMING_CAPTURE_HOW_TO.md` - Detailed timing capture guide (optional scripts)

---
