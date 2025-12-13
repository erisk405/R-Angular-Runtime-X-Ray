import {
  PerformanceSnapshot,
  MethodPerformanceData,
  CallStackNode,
} from '../types';
import { SnapshotStorageManager } from './snapshotManager';

/**
 * Manages performance capture sessions
 */
export class SnapshotCaptureManager {
  private isCapturing = false;
  private captureStartTime = 0;
  private capturedData = new Map<string, MethodPerformanceData>();
  private capturedCallStacks: CallStackNode[] = [];

  /**
   * Start a new capture session
   */
  public startCapture(): void {
    this.isCapturing = true;
    this.captureStartTime = Date.now();
    this.capturedData.clear();
    this.capturedCallStacks = [];
    console.log('[CaptureManager] Capture started');
  }

  /**
   * Stop capture and save snapshot
   */
  public async stopCapture(
    name: string,
    storageManager: SnapshotStorageManager
  ): Promise<PerformanceSnapshot> {
    if (!this.isCapturing) {
      throw new Error('No active capture session');
    }

    this.isCapturing = false;
    const gitInfo = await storageManager.getGitInfo();

    const snapshot: PerformanceSnapshot = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      gitBranch: gitInfo?.branch,
      gitCommit: gitInfo?.commit,
      methods: this.capturedData,
      callStacks: this.capturedCallStacks,
      metadata: {
        totalMethods: this.capturedData.size,
        totalCalls: Array.from(this.capturedData.values()).reduce(
          (sum, m) => sum + m.executions.length,
          0
        ),
        captureStartTime: this.captureStartTime,
        captureEndTime: Date.now(),
      },
    };

    await storageManager.saveSnapshot(snapshot);
    console.log(
      `[CaptureManager] Capture stopped. Saved ${snapshot.metadata.totalMethods} methods, ${snapshot.metadata.totalCalls} calls`
    );

    return snapshot;
  }

  /**
   * Record method performance data during capture
   */
  public recordData(data: MethodPerformanceData): void {
    if (!this.isCapturing) {
      return;
    }

    const key = `${data.className}.${data.methodName}`;
    this.capturedData.set(key, data);
  }

  /**
   * Record a call stack during capture
   */
  public recordCallStack(callStack: CallStackNode): void {
    if (!this.isCapturing) {
      return;
    }

    this.capturedCallStacks.push(callStack);
  }

  /**
   * Check if currently capturing
   */
  public isCaptureActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Get current capture statistics
   */
  public getCaptureStats(): {
    isActive: boolean;
    methodCount: number;
    callStackCount: number;
    duration: number;
  } {
    return {
      isActive: this.isCapturing,
      methodCount: this.capturedData.size,
      callStackCount: this.capturedCallStacks.length,
      duration: this.isCapturing ? Date.now() - this.captureStartTime : 0,
    };
  }

  /**
   * Cancel current capture without saving
   */
  public cancelCapture(): void {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;
    this.capturedData.clear();
    this.capturedCallStacks = [];
    console.log('[CaptureManager] Capture cancelled');
  }
}
