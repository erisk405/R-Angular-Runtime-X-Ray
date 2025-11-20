/**
 * Performance message received from the Runtime Probe
 */
export interface PerformanceMessage {
  type: 'performance';
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
 * Native module interface (Rust bindings)
 */
export interface NativeModule {
  locateFile(className: string, workspacePath: string): FileLocation;
  parseMethod(fileContent: string, methodName: string): MethodLocation;
}
