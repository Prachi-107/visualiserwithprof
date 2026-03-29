// ============================================================================
// NNTrainer Timing Instrumentation Patch
// ============================================================================
// FILE: nntrainer/graph/network_graph.cpp
// 
// CHANGES:
// 1. Add #include <chrono> and <fstream> at the top
// 2. Add member variable to NetworkGraph class to store timing data
// 3. Modify forwarding() and backwarding() methods to measure layer-wise time
// 4. Add saveTimingData() method to write model_timing.txt
// 5. Call saveTimingData() after training completes
//
// ============================================================================

#include <chrono>
#include <fstream>
#include <map>
#include <string>

namespace nntrainer {

// ============================================================================
// STEP 1: Add to NetworkGraph class definition (network_graph.h)
// ============================================================================
// In the NetworkGraph class declaration, add these private members:
//
// private:
//   struct LayerTiming {
//     std::string layer_name;
//     std::string layer_type;
//     double total_time_ms = 0.0;
//     double forward_time_ms = 0.0;
//     double backward_time_ms = 0.0;
//     double weight_update_time_ms = 0.0;
//     int call_count = 0;
//   };
//
//   std::map<std::string, LayerTiming> layer_timings;
//   void saveTimingData(const std::string& filepath);
//

// ============================================================================
// STEP 2: Implementation in network_graph.cpp
// ============================================================================

/**
 * @brief Save timing data to file
 * @param[in] filepath Path where model_timing.txt will be written
 * 
 * Format:
 * layer_name layer_type total_time forward_time backward_time weight_update_time
 * input Input 0.002 0.002 0 0
 * conv2d_1 Conv2D 5.430 2.100 3.330 0
 * ...
 */
void NetworkGraph::saveTimingData(const std::string& filepath) {
  std::ofstream timing_file(filepath);
  
  if (!timing_file.is_open()) {
    ml_loge("Failed to open timing file for writing: %s", filepath.c_str());
    return;
  }

  // Write header comment
  timing_file << "# NNTrainer Layer Execution Timing Data\n";
  timing_file << "# Format: layer_name layer_type total_time(ms) forward(ms) backward(ms) "
              << "weight_update(ms)\n";
  timing_file << "#\n";

  // Write timing data for each layer
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

// ============================================================================
// STEP 3: Modify forwarding() method
// ============================================================================
// REPLACE the existing forwarding() method with this instrumented version:

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
    
    // Original profiling (keep as is)
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

// ============================================================================
// STEP 4: Modify backwarding() method
// ============================================================================
// REPLACE the existing backwarding() method with this instrumented version:

bool NetworkGraph::backwarding(
  int iteration,
  std::function<void(std::shared_ptr<LayerNode>, bool)> &forwarding_op,
  std::function<bool(std::shared_ptr<LayerNode>, int)> &backwarding_op,
  std::function<void(Weight &, int)> &lazy_apply_grad_op,
  std::function<bool(void *userdata)> stop_cb, void *userdata) {

  auto iter_begin = getBackwardingBeginIter();
  auto iter_end = getBackwardingEndIter();

  for (auto iter = iter_begin; iter != iter_end && !stop_cb(userdata); --iter) {
    auto &ln = *iter;
    const std::string layer_name = ln->getName();
    const std::string layer_type = ln->getType();

    // Record backward start time
    auto backward_start = std::chrono::high_resolution_clock::now();
    
    PROFILE_TIME_START(profile_keys.at(ln->getType()));
    bool return_status = backwarding_op(*iter, iteration);
    PROFILE_TIME_END(profile_keys.at(ln->getType()));
    
    auto backward_end = std::chrono::high_resolution_clock::now();
    auto backward_duration = std::chrono::duration<double, std::milli>(backward_end - backward_start);

    // Store backward timing
    if (layer_timings.find(layer_name) == layer_timings.end()) {
      layer_timings[layer_name] = LayerTiming{layer_name, layer_type, 0, 0, 0, 0, 0};
    }
    layer_timings[layer_name].backward_time_ms += backward_duration.count();
    layer_timings[layer_name].total_time_ms += backward_duration.count();

    if (!return_status) {
      return false;
    }
  }

  // Weight update phase with timing
  for (auto iter = iter_begin; iter != iter_end; --iter) {
    auto &ln = *iter;
    const std::string layer_name = ln->getName();

    auto update_start = std::chrono::high_resolution_clock::now();
    
    for (auto idx = 0u; idx < ln->getNumWeights(); ++idx) {
      lazy_apply_grad_op(ln->getWeight(idx), iteration);
    }
    
    auto update_end = std::chrono::high_resolution_clock::now();
    auto update_duration = std::chrono::duration<double, std::milli>(update_end - update_start);

    if (layer_timings.find(layer_name) != layer_timings.end()) {
      layer_timings[layer_name].weight_update_time_ms += update_duration.count();
      layer_timings[layer_name].total_time_ms += update_duration.count();
    }
  }

  return true;
}

// ============================================================================
// STEP 5: Call saveTimingData after training
// ============================================================================
// In your training loop (e.g., in model.hpp or your app code), after
// training completes, add:
//
//   network_graph->saveTimingData("model_timing.txt");
//
// Or in a save method:
//
// void Model::save(...) {
//   // ... existing save code ...
//   
//   if (enable_timing) {
//     network_graph->saveTimingData("model_timing.txt");
//   }
// }
//

// ============================================================================
// ALTERNATE FORMAT (CSV-style):
// ============================================================================
// If you prefer CSV format instead, use this version of saveTimingData:

void NetworkGraph::saveTimingDataCSV(const std::string& filepath) {
  std::ofstream timing_file(filepath);
  
  if (!timing_file.is_open()) {
    ml_loge("Failed to open timing file for writing: %s", filepath.c_str());
    return;
  }

  // Write CSV header
  timing_file << "layer_name,layer_type,total_time_ms,forward_ms,backward_ms,weight_update_ms,call_count\n";

  // Write timing data
  for (const auto& [layer_name, timing] : layer_timings) {
    timing_file << timing.layer_name << ","
                << timing.layer_type << ","
                << std::fixed << std::setprecision(6)
                << timing.total_time_ms << ","
                << timing.forward_time_ms << ","
                << timing.backward_time_ms << ","
                << timing.weight_update_time_ms << ","
                << timing.call_count << "\n";
  }

  timing_file.close();
  ml_logi("Timing data (CSV) saved to %s", filepath.c_str());
}

} // namespace nntrainer
