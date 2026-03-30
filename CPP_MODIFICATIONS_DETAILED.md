# C++ File Modifications: Step-by-Step Location Guide

## Overview

You need to modify **2 files** in the NNTrainer source code:

```
nntrainer/
└── nntrainer/
    └── graph/
        ├── network_graph.h          ← MODIFY (add struct)
        └── network_graph.cpp        ← MODIFY (add includes, replace method, add function)
```

---

## FILE 1: network_graph.h

### Location
```
nntrainer/nntrainer/graph/network_graph.h
```

### What to Find

Open the file and search for the `NetworkGraph` class definition. Look for the section that says `private:` at the end of the class.

**Approximate line number:** Around line 550-580 (check your version)

### What to Add

Find the existing private member variables at the end. Add these new members **right before the closing brace `};` of the class**:

```cpp
private:
  // NEW: Timing data structures
  struct LayerTiming {
    std::string layer_name;
    std::string layer_type;
    double total_time_ms = 0.0;
    double forward_time_ms = 0.0;
    double backward_time_ms = 0.0;
    double weight_update_time_ms = 0.0;
    int call_count = 0;
  };

  std::map<std::string, LayerTiming> layer_timings;
  void saveTimingData(const std::string& filepath);
```

### Where Exactly

**Search for:** `private:`

The last `private:` section in the class should have existing member variables. Add the above code right before the final `};` that closes the class.

**Example of what you'll see:**

```cpp
private:
  LayerNode *backward_iter_end;    // existing variable
  LayerNode *forward_iter_end;     // existing variable
  bool optimize_memory;             // existing variable
  // ... more variables ...
  
  // ADD YOUR CODE HERE - right before };
  // (the struct and map definitions go here)
};  // <- This closes the NetworkGraph class
```

---

## FILE 2: network_graph.cpp

### Location
```
nntrainer/nntrainer/graph/network_graph.cpp
```

### CHANGE 1: Add Includes at Top

**Line number:** Around 15-45 (after existing includes, before namespace)

**Find:** The section with other `#include` statements

**Example:**
```cpp
#include <activation_layer.h>
#include <addition_layer.h>
#include <bn_layer.h>
// ... many more includes ...
#include <tracer.h>
#include <util_func.h>
// ... last few includes

// ADD THESE THREE LINES HERE:
#include <chrono>      // ← Add this
#include <fstream>     // ← Add this
#include <iomanip>     // ← Add this

#include <cmath>
#include <iostream>
#include <stdexcept>
#include <string>
```

**Note:** Add the three new includes right after the last existing `#include` statement and before other code.

---

### CHANGE 2: Replace forwarding() Method

**Line number:** Around 394

**Find:** Search for `sharedConstTensors NetworkGraph::forwarding(`

**What it looks like:**
```cpp
sharedConstTensors NetworkGraph::forwarding(
  bool training,
  std::function<void(std::shared_ptr<LayerNode>, bool)> forwarding_op,
  std::function<bool(void *userdata)> stop_cb, void *userdata) {
  for (auto iter = cbegin(); iter != cend() && !stop_cb(userdata); iter++) {
    auto &ln = *iter;
    PROFILE_TIME_START(profile_keys.at(ln->getType()));
    forwarding_op(*iter, training);
    PROFILE_TIME_END(profile_keys.at(ln->getType()));
  }
  // ... rest of method
}
```

**What to do:**
1. Delete the entire `forwarding()` method (from `sharedConstTensors NetworkGraph::forwarding(` to the closing `}`)
2. Copy the **entire instrumented version** from `CODE_SNIPPETS.md` → Section "FILE 2: network_graph.cpp" → "Replace forwarding() method"

**The new version has:**
```cpp
sharedConstTensors NetworkGraph::forwarding(
  bool training,
  std::function<void(std::shared_ptr<LayerNode>, bool)> forwarding_op,
  std::function<bool(void *userdata)> stop_cb, void *userdata) {
  
  for (auto iter = cbegin(); iter != cend() && !stop_cb(userdata); iter++) {
    auto &ln = *iter;
    const std::string layer_name = ln->getName();
    const std::string layer_type = ln->getType();
    
    // NEW: Timing start
    auto start_time = std::chrono::high_resolution_clock::now();
    
    // Keep original profiling
    PROFILE_TIME_START(profile_keys.at(ln->getType()));
    forwarding_op(*iter, training);
    PROFILE_TIME_END(profile_keys.at(ln->getType()));
    
    // NEW: Timing end and storage
    auto end_time = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration<double, std::milli>(end_time - start_time);
    
    if (layer_timings.find(layer_name) == layer_timings.end()) {
      layer_timings[layer_name] = LayerTiming{layer_name, layer_type, 0, 0, 0, 0, 0};
    }
    layer_timings[layer_name].forward_time_ms += duration.count();
    layer_timings[layer_name].total_time_ms += duration.count();
    layer_timings[layer_name].call_count++;
  }

  sharedConstTensors out;
  for (unsigned int i = 0; i < graph.getNumOutputNodes(); ++i) {
    auto const &output_layer_node = LNODE(graph.getOutputNode(i));
    for (unsigned int j = 0; j < output_layer_node->getNumOutputs(); ++j) {
      out.push_back(MAKE_SHARED_TENSOR(output_layer_node->getOutput(j)));
    }
  }

  return out;
}
```

---

### CHANGE 3: Add saveTimingData() Method

**Line number:** At the END of the file (after the last method)

**Find:** Look for the last method of the class, then scroll to the very end

**Location to add:** Right before the final `}` that closes the namespace

**What to add:** Copy the entire `saveTimingData()` method from `CODE_SNIPPETS.md` → "FILE 2" → "Add saveTimingData() method at end"

**What it looks like:**

```cpp
void NetworkGraph::saveTimingData(const std::string& filepath) {
  std::ofstream timing_file(filepath);
  
  if (!timing_file.is_open()) {
    ml_loge("Failed to open timing file for writing: %s", filepath.c_str());
    return;
  }

  // Write header
  timing_file << "# NNTrainer Layer Execution Timing Data\n";
  timing_file << "# Format: layer_name layer_type total_time(ms) forward(ms) backward(ms) weight_update(ms)\n";
  timing_file << "#\n";

  // Write data
  for (const auto& [layer_name, timing] : layer_timings) {
    timing_file << timing.layer_name << " "
                << timing.layer_type << " "
                << std::fixed << std::setprecision(6)
                << timing.total_time_ms << " "
                << timing.forward_time_ms << " "
                << timing.backward_time_ms << " "
                << timing.weight_update_time_ms << "\n";
  }

  timing_file.close();
  ml_logi("Timing data saved to %s", filepath.c_str());
}
```

**Insert before:** The final closing brace and namespace closing (at end of file)

---

## STEP 4: Call saveTimingData() After Training

### Location

Find where your training loop saves the model. This is typically in:
- `Applications/MNIST/jni/model.cpp` or similar
- Your training script
- The main model class

### What to Find

Search for where the model is saved:

```cpp
model->save("model.bin", MODEL_FORMAT_BIN);
model->save("model.ini", MODEL_FORMAT_INI);
```

### What to Add

Right after the model save calls, add:

```cpp
// NEW: Save timing data
network_graph->saveTimingData("model_timing.txt");
```

**Example:**
```cpp
// Existing code
model->save("model.bin", MODEL_FORMAT_BIN);
model->save("model.ini", MODEL_FORMAT_INI);

// ADD THIS LINE:
network_graph->saveTimingData("model_timing.txt");
```

---

## Quick Checklist

- [ ] Found `network_graph.h` in `nntrainer/nntrainer/graph/`
- [ ] Added `LayerTiming` struct to private section
- [ ] Added `std::map<std::string, LayerTiming> layer_timings;`
- [ ] Added `void saveTimingData(const std::string& filepath);`
- [ ] Found `network_graph.cpp` in same directory
- [ ] Added `#include <chrono>` at top
- [ ] Added `#include <fstream>` at top
- [ ] Added `#include <iomanip>` at top
- [ ] Replaced `forwarding()` method with instrumented version
- [ ] Added `saveTimingData()` method at end
- [ ] Added call to `saveTimingData()` after model save in training code

---

## Rebuild NNTrainer

After making all changes:

```bash
cd /storage_data/Snap/nntrainer  # or your path
meson setup build --prefix=$NNTRAINER_ROOT -Denable-nnstreamer=false
ninja -C build
ninja -C build install
```

**Watch for compilation errors** - they will tell you exactly what's wrong and where.

---

## Test Your Changes

Train a model:

```bash
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini
```

**Verify:**
```bash
# Check that model_timing.txt was created
ls -la model_timing.txt

# View the content
cat model_timing.txt
```

**Expected output:**
```
# NNTrainer Layer Execution Timing Data
# Format: layer_name layer_type total_time(ms) forward(ms) backward(ms) weight_update(ms)
#
input Input 0.002 0.002 0 0
conv2d_1 Conv2D 5.430 2.100 3.330 0
conv2d_2 Conv2D 4.820 2.150 2.670 0
```

---

## Troubleshooting

### Compilation Error: "chrono not found"
**Fix:** Check that `#include <chrono>` was added to the includes section

### Compilation Error: "LayerTiming not found"
**Fix:** Check that the struct was added to `network_graph.h` in the `private:` section

### model_timing.txt not created
**Fix:** Check that `saveTimingData()` is being called after model->save()

### Undefined reference to saveTimingData
**Fix:** Make sure the full `saveTimingData()` implementation was added to the end of `network_graph.cpp`

---

## Reference Files

- **CODE_SNIPPETS.md** - Has exact code to copy/paste
- **nntrainer_timing_patch.cpp** - Has all C++ code as reference
- **IMPLEMENTATION_CHECKLIST.md** - Step 1 section has verification

---

## Still Stuck?

If you can't find the exact lines:
1. Search for "NetworkGraph" to find the class
2. Search for "forwarding" to find the method to replace
3. Open the file in VS Code and use "Go to Line" (Ctrl+G)
4. Look at the actual file structure - line numbers may vary

All the code you need is in **CODE_SNIPPETS.md** - just copy and paste!
