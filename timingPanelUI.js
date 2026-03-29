/**
 * ============================================================================
 * Timing Panel Integration for visualizer.html
 * ============================================================================
 * 
 * INTEGRATION STEPS:
 * 1. Add this CSS and HTML to visualizer.html
 * 2. Copy the JavaScript functions below into the existing script section
 * 3. Update the messageHandler to handle timing data
 * 
 * ============================================================================
 */

// ============================================================================
// CSS STYLES (add to <style> block in visualizer.html)
// ============================================================================

const TIMING_STYLES = `
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

.timing-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
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

.timing-panel.dark .timing-btn:hover {
  background: #4e4e4e;
}

/* Layer List */
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

.timing-panel.dark .timing-item:hover {
  background: #323232;
  border-color: #4a4a4a;
}

.timing-panel.dark .timing-item.selected {
  background: #1a3a5e;
  border-color: #0088ff;
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

/* Performance indicators */
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

.timing-panel.dark .timing-medium {
  background: #f57f17;
  color: #fef5e7;
}

.timing-panel.dark .timing-slow {
  background: #d84315;
  color: #ffccbc;
}

/* Detail Breakdown Panel */
.timing-detail {
  display: none;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.timing-detail.visible {
  display: block;
}

.timing-panel.dark .timing-detail {
  background: #252525;
  border-color: #3a3a3a;
}

.timing-detail-title {
  font-size: 12px;
  font-weight: 600;
  color: #0066cc;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e0e0e0;
}

.timing-panel.dark .timing-detail-title {
  color: #64b5f6;
  border-bottom-color: #3a3a3a;
}

.timing-func-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 11px;
  border-bottom: 1px solid #f0f0f0;
}

.timing-panel.dark .timing-func-row {
  border-bottom-color: #3a3a3a;
}

.timing-func-name {
  color: #555;
  flex: 1;
}

.timing-panel.dark .timing-func-name {
  color: #ccc;
}

.timing-func-value {
  color: #0066cc;
  font-weight: 500;
  text-align: right;
  min-width: 60px;
}

.timing-panel.dark .timing-func-value {
  color: #64b5f6;
}

/* Summary Stats */
.timing-summary {
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
  padding: 12px;
  margin-top: 12px;
  font-size: 11px;
  color: #1b5e20;
}

.timing-panel.dark .timing-summary {
  background: #1b5e20;
  border-color: #2e7d32;
  color: #a5d6a7;
}

.timing-summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.timing-summary-label {
  font-weight: 500;
}

.timing-summary-value {
  font-weight: 600;
  text-align: right;
}

/* Empty state */
.timing-empty {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 20px;
}

.timing-panel.dark .timing-empty {
  color: #666;
}
`;

// ============================================================================
// HTML (add to visualizer.html body, next to detail panel)
// ============================================================================

const TIMING_PANEL_HTML = `
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
`;

// ============================================================================
// JAVASCRIPT FUNCTIONS (add to script section in visualizer.html)
// ============================================================================

/**
 * Initialize timing panel and handlers
 */
function initTimingPanel() {
  const panel = document.getElementById('timingPanel');
  const loadBtn = document.getElementById('timingLoadBtn');
  
  if (!loadBtn) return;

  loadBtn.addEventListener('click', () => {
    // Signal to extension to load timing file
    vscode.postMessage({
      command: 'loadTiming'
    });
  });

  // Listen for timing data from extension
  window.addEventListener('message', (event) => {
    const { data } = event;
    if (data.command === 'displayTiming') {
      displayTimingData(data.timing);
    }
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

  // Clear existing items
  list.innerHTML = '';

  // Calculate percentiles for color coding
  const times = timingData.layers.map(l => l.total_ms);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);

  // Render layer items
  timingData.layers.forEach((layer) => {
    const item = document.createElement('div');
    item.className = 'timing-item';
    
    // Color code based on performance
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

    // Click handler to show function breakdown
    item.addEventListener('click', () => {
      document.querySelectorAll('.timing-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      showTimingDetail(layer);
    });

    list.appendChild(item);
  });

  // Update summary
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

  if (!layer.functions || Object.keys(layer.functions).length === 0) {
    // If no function breakdown available, show aggregate
    content.innerHTML = `
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
  } else {
    // Render detailed function breakdown
    let html = '';
    for (const [funcName, value] of Object.entries(layer.functions)) {
      if (value > 0) {
        html += `
          <div class="timing-func-row">
            <span class="timing-func-name">${funcName.replace(/_/g, ' ')}</span>
            <span class="timing-func-value">${value.toFixed(3)} ms</span>
          </div>
        `;
      }
    }
    content.innerHTML = html;
  }

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

/**
 * Apply dark mode styling to timing panel
 * @param {boolean} isDark - Whether dark mode is enabled
 */
function setTimingPanelDarkMode(isDark) {
  const panel = document.getElementById('timingPanel');
  if (panel) {
    panel.classList.toggle('dark', isDark);
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
  initTimingPanel();
});

// Listen for theme changes
window.addEventListener('message', (event) => {
  const { data } = event;
  if (data.command === 'setTheme') {
    setTimingPanelDarkMode(data.theme === 'dark');
  }
});
`;

// ============================================================================
// INTEGRATION: Add to extension.js messageHandler
// ============================================================================

/*
In extension.js, update the message handler to handle the 'loadTiming' command:

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
    
    // Send to all webviews
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
*/

// ============================================================================
// ALTERNATIVE: Inline HTML integration
// ============================================================================

/*
If you prefer to add the timing panel directly to visualizer.html without
separate files, use this approach:

1. Add TIMING_STYLES to the <style> block
2. Add TIMING_PANEL_HTML before </body>
3. Add the JavaScript functions to the <script> section
4. Update the messageHandler in extension.js to handle 'loadTiming'
*/

module.exports = {
  TIMING_STYLES,
  TIMING_PANEL_HTML
};
