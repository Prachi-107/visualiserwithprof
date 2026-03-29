# Timing Implementation: Copy-Paste Checklist

Use this checklist to track your progress. Copy code snippets directly from here.

---

## ✅ PHASE 1: C++ BACKEND (30-60 minutes)

### Step 1.1: Update network_graph.h

**Location:** `nntrainer/nntrainer/graph/network_graph.h`

Find the `NetworkGraph` class declaration and add these private members:

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

**Status:** [ ] Done

---

### Step 1.2: Add Includes to network_graph.cpp

**Location:** `nntrainer/nntrainer/graph/network_graph.cpp` (top of file)

Add these includes after existing includes:

```cpp
#include <chrono>
#include <fstream>
#include <iomanip>
```

**Status:** [ ] Done

---

### Step 1.3: Implement saveTimingData() Method

**Location:** `nntrainer/nntrainer/graph/network_graph.cpp` (end of file)

Copy the full implementation from `nntrainer_timing_patch.cpp` - the `NetworkGraph::saveTimingData()` method.

**Status:** [ ] Done

---

### Step 1.4: Replace forwarding() Method

**Location:** `nntrainer/nntrainer/graph/network_graph.cpp` (around line 394)

Replace the existing `forwarding()` method with the instrumented version from `nntrainer_timing_patch.cpp`.

**Key Changes:**
```cpp
// Before forwarding_op:
auto start_time = std::chrono::high_resolution_clock::now();

// After forwarding_op:
auto end_time = std::chrono::high_resolution_clock::now();
auto duration = std::chrono::duration<double, std::milli>(end_time - start_time);

// Store timing:
layer_timings[layer_name].forward_time_ms += duration.count();
layer_timings[layer_name].total_time_ms += duration.count();
```

**Status:** [ ] Done

---

### Step 1.5: Replace backwarding() Method

**Location:** `nntrainer/nntrainer/graph/network_graph.cpp` (around line 441)

Replace the existing `backwarding()` method with the instrumented version from `nntrainer_timing_patch.cpp`.

**Key Changes:**
- Wrap backward phase with timing
- Wrap weight update phase with timing
- Store both backward_time_ms and weight_update_time_ms

**Status:** [ ] Done

---

### Step 1.6: Call saveTimingData() After Training

**Location:** Find where `model->save()` or training loop ends

Add this call:

```cpp
// After training completes:
network_graph->saveTimingData("model_timing.txt");

// Or in Model class:
if (enable_timing) {
  network_graph->saveTimingData("model_timing.txt");
}
```

**Status:** [ ] Done

---

### Step 1.7: Rebuild NNTrainer

```bash
cd /path/to/nntrainer
meson setup build --prefix=$NNTRAINER_ROOT -Denable-nnstreamer=false
ninja -C build
ninja -C build install
```

**Verify:** Check for compilation errors
**Status:** [ ] Done

---

### Step 1.8: Test C++ Backend

**Location:** Run any training script

```bash
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini
```

**Verify:** Check that `model_timing.txt` is created in current directory
**Status:** [ ] Done

**Expected Output:**
```
# NNTrainer Layer Execution Timing Data
input Input 0.002 0.002 0 0
conv2d_1 Conv2D 5.430 2.100 3.330 0
...
```

---

## ✅ PHASE 2: EXTENSION (15-20 minutes)

### Step 2.1: Copy timingParser.js

**Location:** Copy to your extension source directory

```bash
cp timingParser.js /path/to/your/extension/src/
```

**Status:** [ ] Done

---

### Step 2.2: Update extension.js - Add Require

**Location:** `extension.js` (top of file, with other requires)

```javascript
const TimingParser = require('./timingParser');
```

**Status:** [ ] Done

---

### Step 2.3: Add loadTiming Message Handler

**Location:** `extension.js` - in your message handler (typically in `onDidReceiveMessage`)

```javascript
case 'loadTiming': {
  const TimingParser = require('./timingParser');
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    break;
  }

  const timingPath = path.join(workspaceFolder.uri.fsPath, 'model_timing.txt');
  
  if (!fs.existsSync(timingPath)) {
    vscode.window.showWarningMessage(
      'model_timing.txt not found. Train the model first.'
    );
    break;
  }

  try {
    const parser = new TimingParser();
    const timingData = parser.parseTimingFileSync(timingPath);
    
    // Log to console
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
    vscode.window.showErrorMessage(
      `Failed to load timing data: ${err.message}`
    );
  }
  break;
}
```

**Status:** [ ] Done

---

### Step 2.4: Test Extension Handler

**Location:** In VS Code

1. Open Command Palette (Ctrl+Shift+P)
2. Select "Developer: Reload Window"
3. Open visualizer
4. Check console for any errors

**Verify:** No errors in console when extension loads
**Status:** [ ] Done

---

## ✅ PHASE 3: VISUALIZER UI (20-30 minutes)

### Step 3.1: Add CSS Styles to visualizer.html

**Location:** `visualizer.html` - in the `<style>` section

Copy all CSS from `timingPanelUI.js` - the `TIMING_STYLES` constant.

**Include:**
- `.timing-panel` and variants
- `.timing-list` and `.timing-item`
- `.timing-detail` and function breakdown
- `.timing-summary`
- Dark mode classes (`.timing-panel.dark`)
- Color coding (`.timing-fast`, `.timing-medium`, `.timing-slow`)

**Status:** [ ] Done

---

### Step 3.2: Add HTML Panel to visualizer.html

**Location:** `visualizer.html` - before `</body>` tag

Copy the HTML from `timingPanelUI.js` - the `TIMING_PANEL_HTML` constant:

```html
<div id="timingPanel" class="timing-panel" style="display: none;">
  <div class="timing-header">
    <span>⏱ Layer Timing</span>
    <button id="timingLoadBtn" class="timing-btn active" title="Load timing data">
      Load Timing
    </button>
  </div>

  <div id="timingList" class="timing-list">
    <div class="timing-empty">No timing data loaded</div>
  </div>

  <div id="timingDetail" class="timing-detail">
    <div class="timing-detail-title">Function Breakdown</div>
    <div id="timingDetailContent"></div>
  </div>

  <div id="timingSummary" class="timing-summary" style="display: none;">
    <!-- Summary stats go here -->
  </div>
</div>
```

**Status:** [ ] Done

---

### Step 3.3: Add JavaScript Functions to visualizer.html

**Location:** `visualizer.html` - in the `<script>` section

Copy all functions from `timingPanelUI.js`:

```javascript
function initTimingPanel() { ... }
function displayTimingData(timingData) { ... }
function showTimingDetail(layer) { ... }
function updateTimingSummary(summary) { ... }
function setTimingPanelDarkMode(isDark) { ... }
```

**Status:** [ ] Done

---

### Step 3.4: Initialize Timing Panel on Load

**Location:** `visualizer.html` - in the `DOMContentLoaded` event handler

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // ... existing initialization code ...
  
  initTimingPanel();  // ADD THIS LINE
});
```

**Status:** [ ] Done

---

### Step 3.5: Listen for Timing Data from Extension

**Location:** `visualizer.html` - in the message event listener

Make sure the window.addEventListener for messages includes:

```javascript
window.addEventListener('message', (event) => {
  const { data } = event;
  
  if (data.command === 'displayModel') {
    // ... existing code ...
  }
  
  // ADD THIS:
  if (data.command === 'displayTiming') {
    displayTimingData(data.timing);
  }
});
```

**Status:** [ ] Done

---

### Step 3.6: Test Visualizer UI

**Location:** In VS Code

1. Open visualizer for any model
2. Verify "Load Timing" button appears in panel
3. Click the button
4. Check browser console (F12) for any errors

**Verify:** Button appears and no console errors
**Status:** [ ] Done

---

## ✅ INTEGRATION TEST (30-45 minutes)

### Test 1: Full End-to-End Flow

```bash
# Step 1: Train model
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# Verify model_timing.txt exists
ls -la model_timing.txt
cat model_timing.txt  # Check format
```

**Status:** [ ] Done

```
# Step 2: Open in visualizer
# - Open VS Code
# - Open project folder
# - Right-click model.ini
# - Select "Visualize NNTrainer Model"
# - Wait for graph to load
```

**Status:** [ ] Done

```
# Step 3: Load timing data
# - In visualizer, look for "Load Timing" button
# - Click button
# - Verify timing panel appears with layer list
```

**Status:** [ ] Done

```
# Step 4: Interact with timing data
# - Click on a layer name
# - Verify function breakdown appears
# - Check summary statistics
```

**Status:** [ ] Done

---

### Test 2: Verify Data Accuracy

**Check:**
- [ ] Total time sum ≈ sum of all layer times
- [ ] Forward + backward ≈ total (for each layer)
- [ ] Layer names match model.ini
- [ ] No negative or zero times (except expected zeros)
- [ ] Times are reasonable (>0.001ms, <100000ms)

---

### Test 3: UI Responsiveness

**Check:**
- [ ] Clicking "Load Timing" is responsive
- [ ] Layer list scrolls if too many layers
- [ ] Clicking layer shows detail instantly
- [ ] Colors update based on performance
- [ ] Summary stats update correctly

---

### Test 4: Dark Mode

**Steps:**
1. In VS Code, toggle theme to dark
2. Verify timing panel colors update
3. Check that text is readable

**Status:** [ ] Done

---

## ✅ VERIFICATION CHECKLIST

### Backend Verification

- [ ] `nntrainer_timing_patch.cpp` code integrated
- [ ] `#include <chrono>` added
- [ ] `LayerTiming` struct defined
- [ ] `forwarding()` instrumented
- [ ] `backwarding()` instrumented
- [ ] `saveTimingData()` implemented
- [ ] NNTrainer rebuilt successfully
- [ ] `model_timing.txt` generated after training

### Extension Verification

- [ ] `timingParser.js` copied to extension
- [ ] `require()` statement added to `extension.js`
- [ ] `loadTiming` message handler implemented
- [ ] Parser called and data sent to webview
- [ ] No console errors when loading

### UI Verification

- [ ] CSS styles copied to `visualizer.html`
- [ ] HTML panel added before `</body>`
- [ ] JavaScript functions copied to `<script>`
- [ ] `initTimingPanel()` called on DOMContentLoaded
- [ ] Message listener updated for `displayTiming`
- [ ] Timing panel displays correctly

### Functional Verification

- [ ] User can train a model
- [ ] `model_timing.txt` is created
- [ ] User can click "Load Timing" button
- [ ] Timing data displays in panel
- [ ] User can click layer to see details
- [ ] Summary stats show correct values
- [ ] Dark mode works

---

## 🐛 TROUBLESHOOTING

### Compilation Error: "chrono not found"

**Fix:** Ensure `#include <chrono>` is added near top of network_graph.cpp

```cpp
#include <chrono>  // Add this line
```

---

### Runtime Error: "model_timing.txt not found"

**Fix:** Verify `saveTimingData()` is called after training:

```cpp
// In your training completion code:
network_graph->saveTimingData("model_timing.txt");
```

---

### Parser Error: "Invalid format"

**Check:** File format matches specification:

```
# comments start with #
layer_name Type time1 time2 time3 time4
input Input 0.002 0.002 0 0
conv2d_1 Conv2D 5.430 2.100 3.330 0
```

No extra spaces or tabs.

---

### Timing Panel Doesn't Appear

**Debug:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify `initTimingPanel()` is called
4. Check that CSS is loaded (inspect element)

---

### No Data Displays After Clicking "Load Timing"

**Debug:**
1. Check VS Code console: `Help > Toggle Developer Tools`
2. Look for errors in `loadTiming` handler
3. Verify `model_timing.txt` exists in workspace
4. Check file format with `cat model_timing.txt`

---

## 📋 FINAL CHECKLIST

- [ ] All C++ code integrated and compiled
- [ ] All Node.js code added to extension
- [ ] All HTML/CSS/JS added to visualizer
- [ ] Full end-to-end test completed successfully
- [ ] Timing data displays correctly
- [ ] User can interact with layer details
- [ ] Dark mode works
- [ ] No console errors
- [ ] Performance is acceptable

---

## ✅ YOU'RE DONE!

Once all checkboxes are complete, your timing integration is ready for use.

**Next steps:**
1. Commit changes to your repository
2. Test with real models
3. Consider enhancements (CSV export, real-time streaming, etc.)

---
