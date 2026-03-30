# Complete Ready-to-Use Files - Just Copy and Paste!

## What You Get

I've created **complete, ready-to-use files** with timing support fully integrated:

1. **extension_WITH_TIMING_COMPLETE.js** - Replace your extension.js
2. **visualizer_WITH_TIMING_COMPLETE.html** - Replace your visualizer.html
3. **timingParser.js** - Copy to your extension/src/ folder (already provided)
4. **timingPanelUI.js** - Optional reference (already provided)

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Copy Extension File

**File:** `extension_WITH_TIMING_COMPLETE.js`

Location: `your-extension/src/extension.js`

```bash
# Copy the complete file
cp extension_WITH_TIMING_COMPLETE.js /path/to/your/extension/src/extension.js
```

### Step 2: Copy Visualizer File

**File:** `visualizer_WITH_TIMING_COMPLETE.html`

Location: `your-extension/media/visualizer.html`

```bash
# Backup original first!
cp /path/to/your/media/visualizer.html visualizer.html.backup

# Copy new version
cp visualizer_WITH_TIMING_COMPLETE.html /path/to/your/media/visualizer.html
```

### Step 3: Copy Timing Parser

**File:** `timingParser.js` (already in your package)

Location: `your-extension/src/timingParser.js`

```bash
# This should already be there, but if not:
cp timingParser.js /path/to/your/extension/src/timingParser.js
```

### Step 4: Reload VS Code

```bash
# In VS Code:
# Press Ctrl+Shift+P
# Type: Developer: Reload Window
# Press Enter
```

### Step 5: Test

1. Right-click a `.ini` file
2. Select "Visualize NNTrainer Model"
3. You should see "Load Timing" button in top-right
4. After training generates `model_timing.txt`, click the button
5. See timing data appear in the right panel ✓

---

## File Descriptions

### 1. extension_WITH_TIMING_COMPLETE.js

**What changed:**
- Added `const TimingParser = require('./timingParser');` at top
- Added new message handler: `case 'LOAD_TIMING':`
- New function: `async function loadTimingData(panel, iniPath)`
- Everything else is identical to original

**Key additions:**
```javascript
// NEW: Load timing data
case 'LOAD_TIMING':
  await loadTimingData(panel, iniPath);
  break;

// NEW: Load timing function
async function loadTimingData(panel, iniPath) {
  const folder = path.dirname(iniPath);
  const timingPath = path.join(folder, 'model_timing.txt');
  // ... reads file and sends to webview
}
```

### 2. visualizer_WITH_TIMING_COMPLETE.html

**What changed:**
- Added timing panel HTML in detail section
- Added timing panel styles (CSS)
- Added timing data handling JavaScript
- New button "Load Timing" in topbar
- All original graph/detail functionality preserved

**Key additions:**
```html
<!-- NEW: Timing Panel -->
<div id="timing-panel">
  <div class="timing-header">
    <span>⏱ Timing</span>
  </div>
  <div id="timing-list"></div>
  <div id="timing-detail"></div>
</div>
```

```javascript
// NEW: Handle timing data
function handleTimingLoaded(timingData) {
  // Shows timing panel
  // Lists all layers with times
  // Click layer to see details
}
```

### 3. timingParser.js

**What it does:**
- Reads `model_timing.txt`
- Parses layer timing data
- Calculates summary statistics
- Sends formatted data to webview

**No changes needed** - use as-is

---

## What Works After Setup

✅ Right-click `.ini` file → Opens visualizer
✅ Graph rendered with all layers
✅ Load `.bin` button loads weights
✅ **NEW:** Load Timing button loads timing data
✅ Click layer name to see details
✅ Timing shows: total time, forward, backward, weight update
✅ Color-coded: green=fast, yellow=medium, red=slow

---

## How to Use Timing Feature

### 1. Train Your Model

```bash
# Your normal training (with C++ changes applied):
$NNTRAINER_ROOT/bin/nntrainer Applications/MNIST/res/mnist.ini

# This creates:
# ✓ model.bin
# ✓ model.ini
# ✓ model_timing.txt (NEW - from C++ code)
```

### 2. Open in Visualizer

```bash
# VS Code:
1. Right-click model.ini
2. Select "Visualize NNTrainer Model"
3. Graph loads
```

### 3. Load Timing Data

```bash
# In visualizer:
1. Click "Load Timing" button (top-right)
2. Timing panel appears (right side)
3. See all layers with execution times
4. Click layer name to expand and see:
   - Forward pass time
   - Backward pass time
   - Weight update time
```

---

## File Locations Reference

```
your-extension/
├── src/
│   ├── extension.js                ← Replace with extension_WITH_TIMING_COMPLETE.js
│   └── timingParser.js             ← Copy timingParser.js here
├── media/
│   └── visualizer.html             ← Replace with visualizer_WITH_TIMING_COMPLETE.html
├── package.json
└── ...
```

---

## Troubleshooting

### "Load Timing button doesn't do anything"

**Check:**
1. Does `model_timing.txt` exist in the model directory?
2. Is `timingParser.js` in `extension/src/` folder?
3. Did you reload VS Code after changing files?
4. Check console for errors (Ctrl+Shift+J in webview)

### "Timing panel doesn't show"

**Check:**
1. Did you apply C++ changes to NNTrainer?
2. Did you rebuild NNTrainer?
3. Does `model_timing.txt` exist after training?

```bash
# Verify file exists:
ls -la model_timing.txt
cat model_timing.txt
```

### "Can't read extension.js"

**Possible issue:** File encoding
**Fix:** Make sure file is UTF-8 encoded

```bash
# Check encoding:
file extension_WITH_TIMING_COMPLETE.js

# Convert if needed:
iconv -f UTF-16 -t UTF-8 extension_WITH_TIMING_COMPLETE.js > extension.js
```

---

## Quick Copy-Paste Commands

### If You Have Your Files in Place

```bash
# Assuming files are in /path/to/downloads/
# Replace YOUR_EXTENSION_PATH with actual path

# Backup originals
cp YOUR_EXTENSION_PATH/src/extension.js YOUR_EXTENSION_PATH/src/extension.js.backup
cp YOUR_EXTENSION_PATH/media/visualizer.html YOUR_EXTENSION_PATH/media/visualizer.html.backup

# Copy new files
cp extension_WITH_TIMING_COMPLETE.js YOUR_EXTENSION_PATH/src/extension.js
cp visualizer_WITH_TIMING_COMPLETE.html YOUR_EXTENSION_PATH/media/visualizer.html
cp timingParser.js YOUR_EXTENSION_PATH/src/timingParser.js

# Reload VS Code
# Ctrl+Shift+P → "Developer: Reload Window"
```

---

## Verification

After setup, verify everything works:

```bash
# 1. Check files are in place
ls -la your-extension/src/extension.js
ls -la your-extension/src/timingParser.js
ls -la your-extension/media/visualizer.html

# 2. Check file sizes (roughly)
# extension.js should be ~12-13 KB
# visualizer.html should be ~15 KB
# timingParser.js should be ~10 KB

# 3. Verify timing parser is required in extension.js
grep "TimingParser" your-extension/src/extension.js

# 4. Verify timing panel HTML is in visualizer
grep "timing-panel" your-extension/media/visualizer.html
```

---

## Summary

✅ **Complete files provided** - Just copy and paste
✅ **Fully integrated** - No manual edits needed
✅ **Ready to use** - Works out of the box
✅ **Backward compatible** - All original features preserved
✅ **Timing support** - Press "Load Timing" button after training

Done! 🎉

---

## Next: C++ Backend

Don't forget - you also need to apply C++ changes to generate `model_timing.txt`:

See: **CPP_MODIFICATIONS_DETAILED.md** for exact file locations

Without C++ changes, `model_timing.txt` won't be created.

---
