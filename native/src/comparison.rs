use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Method data for comparison
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MethodData {
    average_duration: f64,
    executions: Vec<f64>,
}

/// Comparison result for a single method
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ComparisonResult {
    method_key: String,
    baseline_avg: Option<f64>,
    current_avg: Option<f64>,
    percentage_change: Option<f64>,
    absolute_change: Option<f64>,
    diff_type: String, // "improved" | "regressed" | "new" | "removed" | "unchanged"
}

/// Compare performance snapshots
///
/// # Arguments
/// * `baseline_json` - JSON string containing baseline method data
/// * `current_json` - JSON string containing current method data
/// * `regression_threshold` - Percentage threshold for regression detection (e.g., 5.0 for 5%)
///
/// # Returns
/// JSON string containing array of comparison results
pub fn compare_performance_snapshots(
    baseline_json: String,
    current_json: String,
    regression_threshold: f64,
) -> Result<String> {
    // Parse input
    let baseline: HashMap<String, MethodData> = serde_json::from_str(&baseline_json)
        .map_err(|e| Error::from_reason(format!("Baseline parse error: {}", e)))?;

    let current: HashMap<String, MethodData> = serde_json::from_str(&current_json)
        .map_err(|e| Error::from_reason(format!("Current parse error: {}", e)))?;

    // Get all unique method keys
    let mut all_keys: std::collections::HashSet<String> = baseline.keys().cloned().collect();
    all_keys.extend(current.keys().cloned());

    let mut results: Vec<ComparisonResult> = Vec::new();

    for method_key in all_keys {
        let baseline_data = baseline.get(&method_key);
        let current_data = current.get(&method_key);

        let result = match (baseline_data, current_data) {
            (Some(b), Some(c)) => {
                // Both exist - calculate change
                let percentage_change =
                    ((c.average_duration - b.average_duration) / b.average_duration) * 100.0;
                let absolute_change = c.average_duration - b.average_duration;

                let diff_type = if percentage_change > regression_threshold {
                    "regressed"
                } else if percentage_change < -regression_threshold {
                    "improved"
                } else {
                    "unchanged"
                };

                ComparisonResult {
                    method_key: method_key.clone(),
                    baseline_avg: Some(b.average_duration),
                    current_avg: Some(c.average_duration),
                    percentage_change: Some(percentage_change),
                    absolute_change: Some(absolute_change),
                    diff_type: diff_type.to_string(),
                }
            }
            (Some(b), None) => {
                // Method removed
                ComparisonResult {
                    method_key: method_key.clone(),
                    baseline_avg: Some(b.average_duration),
                    current_avg: None,
                    percentage_change: None,
                    absolute_change: None,
                    diff_type: "removed".to_string(),
                }
            }
            (None, Some(c)) => {
                // Method added
                ComparisonResult {
                    method_key: method_key.clone(),
                    baseline_avg: None,
                    current_avg: Some(c.average_duration),
                    percentage_change: None,
                    absolute_change: None,
                    diff_type: "new".to_string(),
                }
            }
            (None, None) => continue, // Should never happen
        };

        results.push(result);
    }

    // Sort by absolute change magnitude (descending)
    results.sort_by(|a, b| {
        let a_change = a.absolute_change.unwrap_or(0.0).abs();
        let b_change = b.absolute_change.unwrap_or(0.0).abs();
        b_change
            .partial_cmp(&a_change)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    serde_json::to_string(&results)
        .map_err(|e| Error::from_reason(format!("JSON stringify error: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regression_detection() {
        let baseline = r#"{
            "ClassA.method1": {"averageDuration": 100.0, "executions": [100.0]},
            "ClassB.method2": {"averageDuration": 50.0, "executions": [50.0]}
        }"#;

        let current = r#"{
            "ClassA.method1": {"averageDuration": 110.0, "executions": [110.0]},
            "ClassB.method2": {"averageDuration": 45.0, "executions": [45.0]}
        }"#;

        let result =
            compare_performance_snapshots(baseline.to_string(), current.to_string(), 5.0).unwrap();

        let parsed: Vec<serde_json::Value> = serde_json::from_str(&result).unwrap();

        // Find method1 (regressed by 10%)
        let method1 = parsed
            .iter()
            .find(|r| r["methodKey"] == "ClassA.method1")
            .unwrap();
        assert_eq!(method1["diffType"], "regressed");
        assert_eq!(method1["percentageChange"], 10.0);

        // Find method2 (improved by 10%)
        let method2 = parsed
            .iter()
            .find(|r| r["methodKey"] == "ClassB.method2")
            .unwrap();
        assert_eq!(method2["diffType"], "improved");
        assert_eq!(method2["percentageChange"], -10.0);
    }

    #[test]
    fn test_new_and_removed_methods() {
        let baseline = r#"{
            "ClassA.oldMethod": {"averageDuration": 100.0, "executions": [100.0]}
        }"#;

        let current = r#"{
            "ClassB.newMethod": {"averageDuration": 50.0, "executions": [50.0]}
        }"#;

        let result =
            compare_performance_snapshots(baseline.to_string(), current.to_string(), 5.0).unwrap();

        let parsed: Vec<serde_json::Value> = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.len(), 2);

        // Check for removed method
        let removed = parsed.iter().find(|r| r["diffType"] == "removed").unwrap();
        assert_eq!(removed["methodKey"], "ClassA.oldMethod");

        // Check for new method
        let new = parsed.iter().find(|r| r["diffType"] == "new").unwrap();
        assert_eq!(new["methodKey"], "ClassB.newMethod");
    }

    #[test]
    fn test_unchanged_within_threshold() {
        let baseline = r#"{
            "ClassA.method1": {"averageDuration": 100.0, "executions": [100.0]}
        }"#;

        let current = r#"{
            "ClassA.method1": {"averageDuration": 102.0, "executions": [102.0]}
        }"#;

        let result = compare_performance_snapshots(
            baseline.to_string(),
            current.to_string(),
            5.0, // 5% threshold
        )
        .unwrap();

        let parsed: Vec<serde_json::Value> = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed[0]["diffType"], "unchanged");
        assert_eq!(parsed[0]["percentageChange"], 2.0); // Within 5% threshold
    }
}
