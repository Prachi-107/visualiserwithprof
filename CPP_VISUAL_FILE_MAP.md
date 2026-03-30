# C++ Modifications: Visual File Maps

## FILE 1: network_graph.h

```
nntrainer/nntrainer/graph/network_graph.h
================================================================================

Line 1-30:  #ifndef, copyright, includes
Line 31-100: Namespace declaration, class start

...

Line 550-560: FIND THIS SECTION - private members
            ─────────────────────────────────────

            private:
              LayerNode *backward_iter_end;
              LayerNode *forward_iter_end;
              bool optimize_memory;
              // ... more variables ...
              
              👇 ADD YOUR CODE HERE 👇
              
              // NEW: Layer Timing (add these lines)
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
              
            };  // <- Class ends here

Line 700+:  End of file
================================================================================

KEY: Find the "private:" section at the END of the NetworkGraph class,
     right before the closing brace "};".
     Add the LayerTiming struct and two member declarations there.
```

---

## FILE 2: network_graph.cpp

```
nntrainer/nntrainer/graph/network_graph.cpp
================================================================================

PART 1: INCLUDES (Line 1-50)
──────────────────────────────

Line 1:     // SPDX-License-Identifier: ...
Line 2-15:  Copyright info
Line 15-45: #include statements

            #include <activation_layer.h>
            #include <addition_layer.h>
            // ... many includes ...
            #include <util_func.h>
            
            👇 ADD HERE 👇
            
            #include <chrono>
            #include <fstream>
            #include <iomanip>
            
            #include <cmath>
            #include <iostream>

Line 45+:   namespace nntrainer {
================================================================================

PART 2: REPLACE forwarding() METHOD (Line 394-417)
──────────────────────────────────────────────────────

Line 394:   sharedConstTensors NetworkGraph::forwarding(
            bool training,
            std::function<void(std::shared_ptr<LayerNode>, bool)> forwarding_op,
            std::function<bool(void *userdata)> stop_cb, void *userdata) {
            
            ❌ DELETE ENTIRE METHOD FROM HERE ❌
            
            for (auto iter = cbegin(); iter != cend() && !stop_cb(userdata); iter++) {
              auto &ln = *iter;
              PROFILE_TIME_START(profile_keys.at(ln->getType()));
              forwarding_op(*iter, training);
              PROFILE_TIME_END(profile_keys.at(ln->getType()));
            }
            
            sharedConstTensors out;
            // ... method continues ...
            return out;
            }  ← End of method (around line 417)
            
            👇 REPLACE WITH NEW CODE 👇
            
            sharedConstTensors NetworkGraph::forwarding(
              bool training,
              std::function<void(std::shared_ptr<LayerNode>, bool)> forwarding_op,
              std::function<bool(void *userdata)> stop_cb, void *userdata) {
              
              for (auto iter = cbegin(); iter != cend() && !stop_cb(userdata); iter++) {
                auto &ln = *iter;
                const std::string layer_name = ln->getName();
                const std::string layer_type = ln->getType();
                
                // NEW: Timing
                auto start_time = std::chrono::high_resolution_clock::now();
                
                PROFILE_TIME_START(profile_keys.at(ln->getType()));
                forwarding_op(*iter, training);
                PROFILE_TIME_END(profile_keys.at(ln->getType()));
                
                auto end_time = std::chrono::high_resolution_clock::now();
                auto duration = std::chrono::duration<double, std::milli>(end_time - start_time);
                
                // Store timing
                if (layer_timings.find(layer_name) == layer_timings.end()) {
                  layer_timings[layer_name] = LayerTiming{...};
                }
                layer_timings[layer_name].forward_time_ms += duration.count();
                // ... more storage code
              }
              
              sharedConstTensors out;
              // ... rest stays the same
              return out;
            }

================================================================================

PART 3: ADD saveTimingData() METHOD (At END of file, before closing brace)
──────────────────────────────────────────────────────────────────────────────

Line 1680:  } // End of some method
Line 1681:  
            👇 ADD HERE - BEFORE THE FINAL CLOSING BRACE 👇
            
            void NetworkGraph::saveTimingData(const std::string& filepath) {
              std::ofstream timing_file(filepath);
              
              if (!timing_file.is_open()) {
                ml_loge("Failed to open timing file for writing: %s", filepath.c_str());
                return;
              }

              timing_file << "# NNTrainer Layer Execution Timing Data\n";
              timing_file << "# Format: layer_name layer_type total_time(ms) forward(ms) backward(ms) weight_update(ms)\n";
              timing_file << "#\n";

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

Line 1700+: } // closes namespace nntrainer
================================================================================

KEY: 
  Part 1: Includes at top (around line 40-45)
  Part 2: Replace forwarding() method (around line 394-417)
  Part 3: Add saveTimingData() at end (before final closing brace)
```

---

## Where to Call saveTimingData()

```
Your Training Code (could be in several places):
================================================================================

FIND THIS:
──────────
  model->save("model.bin", MODEL_FORMAT_BIN);
  model->save("model.ini", MODEL_FORMAT_INI);

REPLACE WITH:
──────────────
  model->save("model.bin", MODEL_FORMAT_BIN);
  model->save("model.ini", MODEL_FORMAT_INI);
  
  // NEW: Save timing data
  network_graph->saveTimingData("model_timing.txt");

POSSIBLE LOCATIONS:
  • Applications/MNIST/jni/model.cpp
  • Applications/MNIST/jni/main.cpp
  • Your custom training script
  • The model save method in model.hpp/cpp
================================================================================
```

---

## Quick Copy-Paste Locations

### Exact Code Locations

**network_graph.h:**
- Line: ~550-560 (search for "private:" at end of class)
- Add: LayerTiming struct (15-20 lines)
- Before: `};` that closes the class

**network_graph.cpp includes:**
- Line: ~40-45 (after other #includes)
- Add: 3 lines (#include <chrono>, <fstream>, <iomanip>)
- Before: namespace statement or first code

**network_graph.cpp forwarding():**
- Line: ~394
- Action: DELETE entire method and REPLACE it
- Find: `sharedConstTensors NetworkGraph::forwarding(`
- Replace: Entire method (40-50 lines)

**network_graph.cpp saveTimingData():**
- Line: ~1680+ (at end before namespace close)
- Add: New method (30-40 lines)
- Before: Final `}` of namespace

**Training code:**
- Line: Varies (search for "model->save")
- Add: `network_graph->saveTimingData("model_timing.txt");`
- After: Other save calls

---

## Verification Checklist

```
✓ network_graph.h
  ├─ Found private: section
  ├─ Added LayerTiming struct
  ├─ Added std::map<std::string, LayerTiming> layer_timings;
  └─ Added void saveTimingData(...);

✓ network_graph.cpp
  ├─ Added #include <chrono>
  ├─ Added #include <fstream>
  ├─ Added #include <iomanip>
  ├─ Replaced forwarding() method with timing code
  ├─ Added saveTimingData() method at end
  └─ Called saveTimingData() in training code

✓ Rebuild
  ├─ meson setup build
  ├─ ninja -C build
  └─ ninja -C build install

✓ Test
  ├─ Run training
  └─ Verify model_timing.txt created
```

---

## File Summary

| File | Change | Lines | Action |
|------|--------|-------|--------|
| network_graph.h | Add struct | 550-560 | Add 15 lines |
| network_graph.cpp | Add includes | 40-45 | Add 3 lines |
| network_graph.cpp | Replace method | 394-417 | Replace 25 lines |
| network_graph.cpp | Add method | 1680+ | Add 35 lines |
| Training code | Add call | Varies | Add 1 line |

---

## Tips for Finding Exact Locations

1. **Use Search (Ctrl+F)**
   - Search: "NetworkGraph::forwarding("
   - Search: "private:" in network_graph.h
   - Search: "model->save"

2. **Use Line Numbers (Ctrl+G)**
   - Press Ctrl+G and type line number
   - Your line numbers may differ from examples

3. **Look at File Structure**
   - Includes are always at top
   - Class members are in private/public sections
   - Methods are in implementation file

4. **When in Doubt**
   - Compare with CODE_SNIPPETS.md
   - Look for similar methods/structures
   - The code will compile and tell you if something's wrong

---

## Still Confused?

All the exact code you need is in:
→ **CODE_SNIPPETS.md** → Copy directly!

Just follow:
1. Open network_graph.h
2. Find "private:" section
3. Paste code from CODE_SNIPPETS
4. Save file
5. Open network_graph.cpp
6. Find "#include" section
7. Paste includes from CODE_SNIPPETS
8. Find "forwarding()" method
9. Replace with code from CODE_SNIPPETS
10. Scroll to end
11. Paste saveTimingData() from CODE_SNIPPETS
12. Find your training code
13. Add one line for saveTimingData() call
14. Rebuild!

Done! ✅
