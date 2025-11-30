import { CallStackNode, PerformanceMessageV2 } from '../types';

/**
 * Builds and manages call stack data for flame graph visualization
 */
export class CallStackBuilder {
  private calls = new Map<string, CallStackNode>();
  private readonly MAX_CALLS = 10000; // Prevent memory issues
  private readonly CLEANUP_THRESHOLD_MS = 300000; // 5 minutes

  /**
   * Add a performance message call to the stack
   */
  public addCall(message: PerformanceMessageV2): void {
    // Auto-cleanup if max size reached
    if (this.calls.size >= this.MAX_CALLS) {
      this.cleanup();
    }

    const node: CallStackNode = {
      callId: message.callId,
      className: message.class,
      methodName: message.method,
      duration: message.duration,
      startTime: message.timestamp,
      endTime: message.timestamp + message.duration,
      children: [],
      parentCallId: message.parentCallId,
      selfTime: message.duration, // Will be calculated later
      filePath: message.file,
    };

    this.calls.set(message.callId, node);
  }

  /**
   * Get all current call stacks as tree structure
   */
  public getCurrentCallStacks(): CallStackNode[] {
    const roots: CallStackNode[] = [];

    // Find root nodes (no parent)
    for (const [callId, node] of this.calls) {
      if (!node.parentCallId) {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Build complete call tree with parent-child relationships
   * This is more efficient for large datasets
   */
  public buildCallTree(): CallStackNode[] {
    const roots: CallStackNode[] = [];
    const nodeMap = new Map<string, CallStackNode>();

    // Clone all nodes
    for (const [callId, node] of this.calls) {
      nodeMap.set(callId, { ...node, children: [] });
    }

    // Build relationships
    for (const [callId, node] of nodeMap) {
      if (!node.parentCallId) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(node.parentCallId);
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    // Calculate self-times
    this.calculateSelfTimes(roots);

    return roots;
  }

  /**
   * Calculate self-time for each node (time excluding children)
   */
  private calculateSelfTimes(nodes: CallStackNode[]): void {
    for (const node of nodes) {
      if (node.children.length > 0) {
        const childrenTime = node.children.reduce(
          (sum, child) => sum + child.duration,
          0
        );
        node.selfTime = Math.max(0, node.duration - childrenTime);
        this.calculateSelfTimes(node.children);
      } else {
        node.selfTime = node.duration;
      }
    }
  }

  /**
   * Clean up old calls to prevent memory issues
   */
  private cleanup(): void {
    const cutoffTime = Date.now() - this.CLEANUP_THRESHOLD_MS;
    let removedCount = 0;

    for (const [callId, node] of this.calls) {
      if (node.startTime < cutoffTime) {
        this.calls.delete(callId);
        removedCount++;
      }
    }

    console.log(`[CallStackBuilder] Cleaned up ${removedCount} old calls`);
  }

  /**
   * Clear all call data
   */
  public clear(): void {
    this.calls.clear();
  }

  /**
   * Get current call count
   */
  public getCallCount(): number {
    return this.calls.size;
  }

  /**
   * Get statistics about current call stacks
   */
  public getStatistics(): {
    totalCalls: number;
    rootCalls: number;
    maxDepth: number;
    oldestCallAge: number;
  } {
    let rootCount = 0;
    let oldestTime = Date.now();

    for (const node of this.calls.values()) {
      if (!node.parentCallId) {
        rootCount++;
      }
      if (node.startTime < oldestTime) {
        oldestTime = node.startTime;
      }
    }

    return {
      totalCalls: this.calls.size,
      rootCalls: rootCount,
      maxDepth: this.calculateMaxDepth(),
      oldestCallAge: Date.now() - oldestTime,
    };
  }

  /**
   * Calculate maximum call stack depth
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;

    const calculateDepth = (callId: string, currentDepth: number): number => {
      let depth = currentDepth;

      for (const node of this.calls.values()) {
        if (node.parentCallId === callId) {
          const childDepth = calculateDepth(node.callId, currentDepth + 1);
          depth = Math.max(depth, childDepth);
        }
      }

      return depth;
    };

    // Calculate from each root
    for (const node of this.calls.values()) {
      if (!node.parentCallId) {
        const depth = calculateDepth(node.callId, 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }
}
