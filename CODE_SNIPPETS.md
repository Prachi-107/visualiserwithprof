# Ready-to-Use Code Snippets

All code organized by destination file. Copy and paste directly!

---

## FILE 1: network_graph.h

### Add to NetworkGraph class (private section)

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

---

## FILE 2: network_graph.cpp

### Add includes at top

```cpp
#include <chrono>
#include <fstream>
#include <iomanip>
```

### Replace forwarding() method

```cpp
sharedConstTensors NetworkGraph::forwarding(
  bool training,
  std::function<void(std::shared_ptr<LayerNode>, bool)> forwarding_op,
  std::function<bool(void *userdata)> stop_cb, void *userdata) {
  
  for (auto iter = cbegin(); iter != cend() && !stop_cb(userdata); iter++) {
    auto &ln = *iter;
    const std::string layer_name = ln->getName();
    const std::string layer_type = ln->getType();
    
    // Record start time
    auto start_time = std::chrono::high_resolution_clock::now();
    
    // Original profiling
    PROFILE_TIME_START(profile_keys.at(ln->getType()));
    forwarding_op(*iter, training);
    PROFILE_TIME_END(profile_keys.at(ln->getType()));
    
    // Record end time and compute duration
    auto end_time = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration<double, std::milli>(end_time - start_time);
    
    // Store timing data
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

### Add saveTimingData() method at end

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

### Call after training (in your model save or train completion method)

```cpp
// After training completes:
network_graph->saveTimingData("model_timing.txt");
```

---

## FILE 3: extension.js

### Add require at top of file

```javascript
const TimingParser = require('./timingParser');
```

### Add message handler in onDidReceiveMessage

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
    vscode.window.showWarningMessage('model_timing.txt not found. Train the model first.');
    break;
  }

  try {
    const parser = new TimingParser();
    const timingData = parser.parseTimingFileSync(timingPath);
    
    console.log(parser.getFormattedTable(timingData));
    
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

## FILE 4: visualizer.html - <style> section

### Add these CSS styles

```css
/* Timing Panel Container */
.timing-panel {
  width: 100%;
  max-width: 320px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.timing-panel.dark {
  background: #1e1e1e;
  border-color: #3e3e3e;
}

.timing-header {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timing-panel.dark .timing-header {
  color: #e0e0e0;
}

.timing-btn {
  padding: 6px 12px;
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.timing-btn:hover {
  background: #e0e0e0;
}

.timing-btn.active {
  background: #0066cc;
  color: #ffffff;
  border-color: #0066cc;
}

.timing-panel.dark .timing-btn {
  background: #3e3e3e;
  border-color: #5e5e5e;
  color: #e0e0e0;
}

.timing-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timing-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f9f9f9;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.timing-item:hover {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

.timing-item.selected {
  background: #e3f2fd;
  border-color: #0066cc;
  font-weight: 500;
}

.timing-panel.dark .timing-item {
  background: #2a2a2a;
  border-color: #3a3a3a;
  color: #e0e0e0;
}

.timing-item-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
}

.timing-item-time {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 3px;
  white-space: nowrap;
}

.timing-fast {
  background: #c8e6c9;
  color: #1b5e20;
}

.timing-medium {
  background: #fff9c4;
  color: #f57f17;
}

.timing-slow {
  background: #ffccbc;
  color: #d84315;
}

.timing-panel.dark .timing-fast {
  background: #2e7d32;
  color: #a5d6a7;
}

.timing-detail {
  display: none;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-top: 12px;
}

.timing-detail.visible {
  display: block;
}

.timing-detail-title {
  font-size: 12px;
  font-weight: 600;
  color: #0066cc;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e0e0e0;
}

.timing-func-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 11px;
  border-bottom: 1px solid #f0f0f0;
}

.timing-func-name {
  color: #555;
  flex: 1;
}

.timing-func-value {
  color: #0066cc;
  font-weight: 500;
  text-align: right;
  min-width: 60px;
}

.timing-summary {
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
  padding: 12px;
  margin-top: 12px;
  font-size: 11px;
  color: #1b5e20;
}

.timing-summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.timing-summary-label {
  font-weight: 500;
}

.timing-empty {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 20px;
}
```

---

## FILE 5: visualizer.html - Before </body>

### Add HTML panel

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
    <div class="timing-summary-row">
      <span class="timing-summary-label">Total Time:</span>
      <span class="timing-summary-value" id="totalTimeValue">0 ms</span>
    </div>
    <div class="timing-summary-row">
      <span class="timing-summary-label">Layers:</span>
      <span class="timing-summary-value" id="layerCountValue">0</span>
    </div>
    <div class="timing-summary-row">
      <span class="timing-summary-label">Bottleneck:</span>
      <span class="timing-summary-value" id="bottleneckValue">—</span>
    </div>
  </div>
</div>
```

---

## FILE 6: visualizer.html - <script> section

### Add JavaScript functions

```javascript
/**
 * Initialize timing panel and handlers
 */
function initTimingPanel() {
  const panel = document.getElementById('timingPanel');
  const loadBtn = document.getElementById('timingLoadBtn');
  
  if (!loadBtn) return;

  loadBtn.addEventListener('click', () => {
    vscode.postMessage({
      command: 'loadTiming'
    });
  });
}

/**
 * Display timing data in the panel
 * @param {Object} timingData - Timing data from TimingParser
 */
function displayTimingData(timingData) {
  if (!timingData || !timingData.layers) {
    console.warn('No timing data provided');
    return;
  }

  const panel = document.getElementById('timingPanel');
  const list = document.getElementById('timingList');
  const summary = document.getElementById('timingSummary');

  list.innerHTML = '';

  const times = timingData.layers.map(l => l.total_ms);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);

  timingData.layers.forEach((layer) => {
    const item = document.createElement('div');
    item.className = 'timing-item';
    
    let category = 'fast';
    if (layer.total_ms > maxTime * 0.75) category = 'slow';
    else if (layer.total_ms > avgTime * 1.2) category = 'medium';

    const timeSpan = document.createElement('span');
    timeSpan.className = `timing-item-time timing-${category}`;
    timeSpan.textContent = layer.total_ms.toFixed(3) + ' ms';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'timing-item-name';
    nameSpan.textContent = layer.name;

    item.appendChild(nameSpan);
    item.appendChild(timeSpan);

    item.addEventListener('click', () => {
      document.querySelectorAll('.timing-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      showTimingDetail(layer);
    });

    list.appendChild(item);
  });

  updateTimingSummary(timingData.summary);
  summary.style.display = 'block';
  panel.style.display = 'block';
}

/**
 * Show function-level breakdown for a selected layer
 * @param {Object} layer - Layer timing data
 */
function showTimingDetail(layer) {
  const detail = document.getElementById('timingDetail');
  const content = document.getElementById('timingDetailContent');

  let html = `
    <div class="timing-func-row">
      <span class="timing-func-name">Forward</span>
      <span class="timing-func-value">${layer.forward_ms.toFixed(3)} ms</span>
    </div>
    <div class="timing-func-row">
      <span class="timing-func-name">Backward</span>
      <span class="timing-func-value">${layer.backward_ms.toFixed(3)} ms</span>
    </div>
    <div class="timing-func-row">
      <span class="timing-func-name">Weight Update</span>
      <span class="timing-func-value">${layer.weight_update_ms.toFixed(3)} ms</span>
    </div>
  `;
  
  content.innerHTML = html;
  detail.classList.add('visible');
}

/**
 * Update summary statistics panel
 * @param {Object} summary - Summary data from TimingParser
 */
function updateTimingSummary(summary) {
  document.getElementById('totalTimeValue').textContent = summary.total_time_ms.toFixed(3) + ' ms';
  document.getElementById('layerCountValue').textContent = summary.num_layers;
  document.getElementById('bottleneckValue').textContent = 
    `${summary.slowest_layer} (${summary.slowest_time_ms.toFixed(3)} ms)`;
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
  // ... existing initialization code ...
  initTimingPanel();  // ADD THIS LINE
});

// Listen for timing data from extension
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

---

## Verify Your Code

After adding all snippets, verify:

✅ All `#include` statements are present in network_graph.cpp
✅ LayerTiming struct is defined in network_graph.h
✅ forwarding() method has timing code
✅ saveTimingData() is implemented
✅ CSS is complete (including dark mode)
✅ HTML panel is complete
✅ All JavaScript functions are present
✅ Event listeners are set up
✅ Message handlers are configured

---
