use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Call stack input from TypeScript
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CallStackInput {
    call_id: String,
    class_name: String,
    method_name: String,
    duration: f64,
    start_time: f64,
    end_time: f64,
    parent_call_id: Option<String>,
    file_path: Option<String>,
    line: Option<u32>,
}

/// Flame graph node for visualization
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FlameGraphNode {
    id: String,
    name: String,
    value: f64,
    self_value: f64,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    children: Vec<FlameGraphNode>,
    depth: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    line: Option<u32>,
    percentage: f64,
}

/// Build flame graph data from call stack nodes
///
/// # Arguments
/// * `call_stack_json` - JSON string containing array of CallStackInput
///
/// # Returns
/// JSON string containing flame graph data structure
#[napi]
pub fn build_flame_graph_data(call_stack_json: String) -> Result<String> {
    // Parse input
    let calls: Vec<CallStackInput> = serde_json::from_str(&call_stack_json)
        .map_err(|e| Error::from_reason(format!("JSON parse error: {}", e)))?;

    if calls.is_empty() {
        return Ok(serde_json::json!({
            "nodes": [],
            "totalDuration": 0.0
        }).to_string());
    }

    // Build call map for O(1) lookups
    let mut call_map: HashMap<String, CallStackInput> = HashMap::new();
    let mut roots: Vec<String> = Vec::new();

    for call in calls {
        if call.parent_call_id.is_none() {
            roots.push(call.call_id.clone());
        }
        call_map.insert(call.call_id.clone(), call);
    }

    // Calculate total duration from root nodes
    let total_duration: f64 = roots
        .iter()
        .filter_map(|id| call_map.get(id))
        .map(|c| c.duration)
        .sum();

    // Build flame graph nodes
    let flame_nodes: Vec<FlameGraphNode> = roots
        .iter()
        .filter_map(|id| build_node(id, &call_map, 0, total_duration))
        .collect();

    // Create result
    let result = serde_json::json!({
        "nodes": flame_nodes,
        "totalDuration": total_duration
    });

    serde_json::to_string(&result)
        .map_err(|e| Error::from_reason(format!("JSON stringify error: {}", e)))
}

/// Recursively build flame graph node
fn build_node(
    call_id: &str,
    call_map: &HashMap<String, CallStackInput>,
    depth: u32,
    total_duration: f64,
) -> Option<FlameGraphNode> {
    let call = call_map.get(call_id)?;

    // Find children
    let children: Vec<FlameGraphNode> = call_map
        .values()
        .filter(|c| c.parent_call_id.as_deref() == Some(call_id))
        .filter_map(|c| build_node(&c.call_id, call_map, depth + 1, total_duration))
        .collect();

    // Calculate self time (time excluding children)
    let children_time: f64 = children.iter().map(|c| c.value).sum();
    let self_time = call.duration - children_time;

    Some(FlameGraphNode {
        id: call.call_id.clone(),
        name: format!("{}.{}", call.class_name, call.method_name),
        value: call.duration,
        self_value: self_time.max(0.0), // Ensure non-negative
        children,
        depth,
        file_path: call.file_path.clone(),
        line: call.line,
        percentage: if total_duration > 0.0 {
            (call.duration / total_duration) * 100.0
        } else {
            0.0
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_call_stack() {
        let result = build_flame_graph_data("[]".to_string()).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["totalDuration"], 0.0);
        assert!(parsed["nodes"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_single_call() {
        let input = r#"[{
            "callId": "call_1",
            "className": "TestClass",
            "methodName": "testMethod",
            "duration": 100.0,
            "startTime": 0.0,
            "endTime": 100.0,
            "parentCallId": null
        }]"#;

        let result = build_flame_graph_data(input.to_string()).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed["totalDuration"], 100.0);
        assert_eq!(parsed["nodes"].as_array().unwrap().len(), 1);
        assert_eq!(parsed["nodes"][0]["name"], "TestClass.testMethod");
        assert_eq!(parsed["nodes"][0]["percentage"], 100.0);
    }

    #[test]
    fn test_parent_child_calls() {
        let input = r#"[
            {
                "callId": "call_1",
                "className": "Parent",
                "methodName": "parentMethod",
                "duration": 100.0,
                "startTime": 0.0,
                "endTime": 100.0,
                "parentCallId": null
            },
            {
                "callId": "call_2",
                "className": "Child",
                "methodName": "childMethod",
                "duration": 60.0,
                "startTime": 10.0,
                "endTime": 70.0,
                "parentCallId": "call_1"
            }
        ]"#;

        let result = build_flame_graph_data(input.to_string()).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed["totalDuration"], 100.0);
        assert_eq!(parsed["nodes"][0]["value"], 100.0);
        assert_eq!(parsed["nodes"][0]["selfValue"], 40.0); // 100 - 60
        assert_eq!(parsed["nodes"][0]["children"].as_array().unwrap().len(), 1);
        assert_eq!(parsed["nodes"][0]["children"][0]["value"], 60.0);
    }
}
