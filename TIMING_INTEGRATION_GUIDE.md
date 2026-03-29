# NNTrainer Visualizer: Timing Integration Guide

## Overview

This guide walks you through adding per-layer execution timing support to your NNTrainer Visualizer extension. The system captures timing data during training and displays it in a new "Layer Timing" panel in the visualizer.

---

## Architecture

```
NNTrainer Backend (C++) → model_timing.txt → Extension (Node.js) → WebView (HTML/JS)
     ↓
  Writes timing for:
  - Per-layer total time
  - Forward pass time
  - Backward pass time
  - Weight update time
```

---

## Step 1: Modify NNTrainer C++ Code

### 1.1 Update network_graph.h

Add these member variables and methods to the `NetworkGraph` class:

```cpp
private:
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

### 1.2 Update network_graph.cpp

Replace the `forwarding()` and `backwarding()` methods with instrumented versions from **nntrainer_timing_patch.cpp**. Key additions:

```cpp
#include <chrono>
#include <fstream>
#include <iomanip>

// In forwarding():
auto start_time = std::chrono::high_resolution_clock::now();
forwarding_op(*iter, training);
auto end_time = std::chrono::high_resolution_clock::now();
auto duration = std::chrono::duration<double, std::milli>(end_time - start_time);

layer_timings[layer_name].forward_time_ms += duration.count();
layer_timings[layer_name].total_time_ms += duration.count();

// Similar for backwarding()
```

### 1.3 Call saveTimingData() After Training

In your training loop or model save method:

```cpp
// After training completes:
network_graph->saveTimingData("model_timing.txt");

// Or in your model.hpp:
void Model::save(...) {
  // ... existing save code ...
  if (enable_timing) {
    network_graph->saveTimingData("model_timing.txt");
  }
}
```

### 1.4 Rebuild NNTrainer

```bash
cd /path/to/nntrainer
meson setup build --prefix=$NNTRAINER_ROOT -Denable-nnstreamer=false
ninja -C build
ninja -C build install
```

---

## Step 2: Add Node.js Timing Parser to Extension

### 2.1 Create timingParser.js

Copy **timingParser.js** to your extension source directory:

```bash
cp /home/claude/timingParser.js /path/to/your/extension/src/
```

### 2.2 Update extension.js

At the top of extension.js, require the parser:

```javascript
const TimingParser = require('./timingParser');
```

### 2.3 Add Message Handler for 'loadTiming'

In your extension's message handler (where you handle commands from the webview):

```javascript
case 'loadTiming': {
  const TimingParser = require('./timingParser');
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    break;
  }

  // Look for model_timing.txt in the same folder as the .ini file
  const timingPath = path.join(workspaceFolder.uri.fsPath, 'model_timing.txt');
  
  if (!fs.existsSync(timingPath)) {
    vscode.window.showWarningMessage('model_timing.txt not found. Run training first.');
    break;
  }

  try {
    const parser = new TimingParser();
    const timingData = parser.parseTimingFileSync(timingPath);
    
    // Log to console for debugging
    console.log(parser.getFormattedTable(timingData));
    
    // Send to all active webviews
    Object.keys(panels).forEach(panelId => {
      if (panels[panelId] && !panels[panelId].disposed) {
        panels[panelId].webview.postMessage({
          command: 'displayTiming',
          timing: timingData
        });
      }
    });
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to load timing data: ${err.message}`);
  }
  break;
}
```

---

## Step 3: Add Timing Panel to Visualizer UI

### 3.1 Update visualizer.html

Add the timing panel CSS and HTML to your visualizer.html:

**In the `<style>` section, add:**

```html
<style>
  /* Copy all CSS from TIMING_STYLES in timingPanelUI.js */
</style>
```

**In the body before `</body>`, add:**

```html
<!-- Copy the TIMING_PANEL_HTML from timingPanelUI.js -->
<div id="timingPanel" class="timing-panel" style="display: none;">
  <!-- ... (see timingPanelUI.js) ... -->
</div>
```

### 3.2 Add JavaScript Functions

In the `<script>` section of visualizer.html, add all functions from **timingPanelUI.js**:

```javascript
// Copy all JavaScript functions from timingPanelUI.js
function initTimingPanel() { ... }
function displayTimingData(timingData) { ... }
function showTimingDetail(layer) { ... }
// ... etc
```

### 3.3 Initialize Timing Panel on Page Load

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // ... existing initialization ...
  initTimingPanel();  // Add this line
});
```

---

## Step 4: model_timing.txt Format

### Format Specification

The C++ backend writes timing data in this format:

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

### Alternative Format: Pipe-Separated

For more detailed function breakdown:

```
input Input 0.002 | forward 0.002ms backward 0ms
conv2d_1 Conv2D 5.430 | forward 2.1ms backward 3.33ms weight_update 0.002ms
```

The TimingParser handles both formats automatically.

---

## Step 5: Usage Instructions

### For Users

1. **Train the model** with NNTrainer:
   ```bash
   $NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini
   ```
   This generates: `model.bin`, `model.ini`, and `model_timing.txt`

2. **Open the visualizer** in VS Code:
   - Right-click on `model.ini` → "Visualize NNTrainer Model"

3. **Load timing data**:
   - In the visualizer panel, click "Load Timing" button
   - Timing data appears in the Layer Timing panel on the right

4. **Explore per-layer breakdown**:
   - Click any layer to see function-level timing
   - Green = fast (&lt;0.5ms)
   - Yellow = medium
   - Red = slow (&gt;2ms)

### Example Workflow

```bash
# Step 1: Train with timing instrumentation
cd /storage_data/Snap/nntrainer
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# This creates:
# - mnist.ini (exists)
# - model.bin (weights)
# - model_timing.txt (NEW - timing data)

# Step 2: Open in VS Code
code /storage_data/Snap/nntrainer

# Step 3: Right-click mnist.ini → "Visualize NNTrainer Model"

# Step 4: In visualizer, click "Load Timing" button
# ✅ See per-layer timing breakdown
```

---

## Performance Tuning Guide

Once timing data is displayed:

### Identifying Bottlenecks

1. **Red/slow layers** indicate where time is spent
2. **Function breakdown** shows if issue is forward, backward, or weight update
3. **Compare relative times** across layers

### Example Interpretation

```
conv2d_1: 5.430 ms
├─ forward:       2.100 ms (38%)
├─ backward:      3.330 ms (61%)
└─ weight_update: 0.002 ms (0.04%)
```

→ Backward pass is the bottleneck. Consider:
- Gradient computation optimization
- Memory layout for backward pass
- Reduce filter size or use stride

### Optimization Targets

| Pattern | Issue | Solution |
|---------|-------|----------|
| Forward >> Backward | Convolution heavy | Reduce filters, increase stride |
| Backward >> Forward | Gradient computation | Check layer config, consider gradient checkpointing |
| weight_update spike | Parameter update slow | Check learning rate scheduler, batch normalization |

---

## Troubleshooting

### Problem: "model_timing.txt not found"

**Solution:**
- Ensure training completed and model was saved
- Check that C++ patch is compiled into NNTrainer
- Verify `saveTimingData()` is called after training

### Problem: Timing shows all zeros

**Solution:**
- Check that `<chrono>` header is included
- Verify timing instrumentation is in the forwarding/backwarding methods
- Layers may be too fast to measure (add filler operations for testing)

### Problem: Parser error: "Invalid format"

**Solution:**
- Check model_timing.txt format matches spec (space-separated)
- Ensure no extra whitespace at line ends
- Verify comment lines start with `#`

### Problem: Extension doesn't show timing panel

**Solution:**
- Check browser console for errors (`Ctrl+Shift+J` in webview)
- Verify `initTimingPanel()` is called in DOMContentLoaded
- Check that CSS is properly loaded (inspect element)

---

## File Checklist

- [ ] `nntrainer_timing_patch.cpp` — C++ instrumentation code
- [ ] `timingParser.js` — Node.js parser for timing.txt
- [ ] `timingPanelUI.js` — HTML/CSS/JS for visualizer UI
- [ ] `extension.js` — Updated with 'loadTiming' handler
- [ ] `visualizer.html` — Updated with timing panel HTML/CSS/JS
- [ ] `network_graph.cpp` — Patched with timing instrumentation
- [ ] `network_graph.h` — Added LayerTiming struct and saveTimingData method

---

## Next Steps

### Optional Enhancements

1. **Export timing data**:
   - Add CSV export button in timing panel
   - Create performance report PDF

2. **Real-time timing**:
   - Stream timing data during training (requires WebSocket)
   - Live performance chart

3. **Comparison mode**:
   - Load two model_timing.txt files side-by-side
   - Show performance improvement/regression

4. **Batch profiling**:
   - Profile multiple models at once
   - Generate benchmark comparison table

---

## Questions or Issues?

If you encounter problems:
1. Check the troubleshooting section above
2. Review the inline comments in the code files
3. Enable debug logging in extension.js
4. Check VS Code developer tools (`Help > Toggle Developer Tools`)

---

## Version History

- **v1.0** (Current)
  - Per-layer total timing
  - Forward/backward/weight_update breakdown
  - Color-coded performance indicators
  - Function-level detail view

---
