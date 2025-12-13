/**
 * Performance message received from the Runtime Probe
 */
export interface PerformanceMessage {
  type: "performance";
  class: string;
  method: string;
  duration: number;
  file?: string;
  changeDetectionCount?: number;
}

/**
 * File location result from Rust native module
 */
export interface FileLocation {
  filePath: string;
  found: boolean;
}

/**
 * Method location result from Rust native module
 */
export interface MethodLocation {
  line: number;
  found: boolean;
}

/**
 * Performance data aggregated per method
 */
export interface MethodPerformanceData {
  className: string;
  methodName: string;
  filePath?: string;
  line?: number;
  executions: number[];
  averageDuration: number;
  lastDuration: number;
  changeDetectionCount?: number;
}

/**
 * Enhanced performance message with call stack tracking (V2)
 */
export interface PerformanceMessageV2 extends PerformanceMessage {
  callId: string;
  parentCallId?: string;
  timestamp: number;
  stackDepth: number;
}

/**
 * Call stack node for building hierarchical trees
 */
export interface CallStackNode {
  callId: string;
  className: string;
  methodName: string;
  duration: number;
  startTime: number;
  endTime: number;
  children: CallStackNode[];
  parentCallId?: string;
  selfTime: number;
  filePath?: string;
  line?: number;
}

/**
 * Flame graph data structure optimized for visualization
 */
export interface FlameGraphData {
  nodes: FlameGraphNode[];
  totalDuration: number;
  rootCallId?: string;
}

/**
 * Flame graph node for D3.js rendering
 */
export interface FlameGraphNode {
  id: string;
  name: string;
  value: number;
  selfValue: number;
  children: FlameGraphNode[];
  depth: number;
  filePath?: string;
  line?: number;
  percentage: number;
}

/**
 * Performance snapshot for comparative analysis
 */
export interface PerformanceSnapshot {
  id: string;
  name: string;
  timestamp: number;
  gitBranch?: string;
  gitCommit?: string;
  methods: Map<string, MethodPerformanceData>;
  callStacks: CallStackNode[];
  metadata: {
    totalMethods: number;
    totalCalls: number;
    captureStartTime: number;
    captureEndTime: number;
  };
}

/**
 * Snapshot metadata for listing
 */
export interface SnapshotMetadata {
  id: string;
  name: string;
  timestamp: number;
  gitBranch?: string;
  gitCommit?: string;
}

/**
 * Comparison result between two snapshots
 */
export interface PerformanceComparison {
  baseline: SnapshotMetadata;
  current: SnapshotMetadata;
  differences: MethodPerformanceDiff[];
  summary: {
    totalMethodsCompared: number;
    improvements: number;
    regressions: number;
    unchanged: number;
    newMethods: number;
    removedMethods: number;
  };
}

/**
 * Method performance difference
 */
export interface MethodPerformanceDiff {
  methodKey: string;
  baselineAvg: number | null;
  currentAvg: number | null;
  percentageChange: number | null;
  absoluteChange: number | null;
  diffType: "improved" | "regressed" | "new" | "removed" | "unchanged";
}

/**
 * Native module interface (Rust bindings)
 */
export interface NativeModule {
  locateFile(className: string, workspacePath: string): FileLocation;
  parseMethod(fileContent: string, methodName: string): MethodLocation;
  buildFlameGraphData(callStackJson: string): string;
  comparePerformanceSnapshots(
    baselineJson: string,
    currentJson: string,
    regressionThreshold: number,
  ): string;
  compressSnapshotData(snapshotJson: string): Buffer;
  decompressSnapshotData(compressedData: Buffer): string;
}
