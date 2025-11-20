import { xrayClient } from './websocket-client';

/**
 * Performance message structure
 */
interface PerformanceMessage {
  type: 'performance';
  class: string;
  method: string;
  duration: number;
  file?: string;
  changeDetectionCount?: number;
}

/**
 * Performance decorator for tracking method execution time
 *
 * Usage:
 * ```typescript
 * @Performance()
 * myMethod() {
 *   // method body
 * }
 * ```
 *
 * With file path:
 * ```typescript
 * @Performance({ file: __filename })
 * myMethod() {
 *   // method body
 * }
 * ```
 */
export function Performance(options?: { file?: string }): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();

      try {
        // Execute the original method
        const result = originalMethod.apply(this, args);

        // Handle async methods (Promises)
        if (result && typeof result.then === 'function') {
          return result.then(
            (value: any) => {
              recordPerformance(startTime);
              return value;
            },
            (error: any) => {
              recordPerformance(startTime);
              throw error;
            }
          );
        }

        // Handle sync methods
        recordPerformance(startTime);
        return result;

      } catch (error) {
        recordPerformance(startTime);
        throw error;
      }
    };

    function recordPerformance(startTime: number): void {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const message: PerformanceMessage = {
        type: 'performance',
        class: className,
        method: methodName,
        duration,
        file: options?.file
      };

      xrayClient.send(message);
    }

    return descriptor;
  };
}

/**
 * Angular Change Detection tracking
 */
class ChangeDetectionTracker {
  private componentCounts = new Map<string, number>();

  /**
   * Track a change detection cycle for a component
   */
  public trackCycle(componentName: string): void {
    const count = this.componentCounts.get(componentName) || 0;
    this.componentCounts.set(componentName, count + 1);
  }

  /**
   * Get the change detection count for a component
   */
  public getCount(componentName: string): number {
    return this.componentCounts.get(componentName) || 0;
  }

  /**
   * Reset the count for a component
   */
  public resetCount(componentName: string): void {
    this.componentCounts.set(componentName, 0);
  }

  /**
   * Clear all counts
   */
  public clearAll(): void {
    this.componentCounts.clear();
  }
}

export const cdTracker = new ChangeDetectionTracker();

/**
 * Decorator for tracking Angular change detection cycles
 * Apply to ngDoCheck lifecycle hook
 *
 * Usage:
 * ```typescript
 * @TrackChangeDetection()
 * ngDoCheck() {
 *   // component check logic
 * }
 * ```
 */
export function TrackChangeDetection(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const componentName = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      // Track the cycle
      cdTracker.trackCycle(componentName);

      // Execute original method
      const result = originalMethod.apply(this, args);

      // Send update periodically (every 10 cycles to avoid spam)
      const count = cdTracker.getCount(componentName);
      if (count % 10 === 0) {
        const message: PerformanceMessage = {
          type: 'performance',
          class: componentName,
          method: 'ngDoCheck',
          duration: 0,
          changeDetectionCount: count
        };
        xrayClient.send(message);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Enhanced Performance decorator that also tracks change detection
 * for Angular components
 */
export function PerformanceWithCD(options?: { file?: string }): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();

      try {
        const result = originalMethod.apply(this, args);

        if (result && typeof result.then === 'function') {
          return result.then(
            (value: any) => {
              recordPerformanceWithCD(startTime);
              return value;
            },
            (error: any) => {
              recordPerformanceWithCD(startTime);
              throw error;
            }
          );
        }

        recordPerformanceWithCD(startTime);
        return result;

      } catch (error) {
        recordPerformanceWithCD(startTime);
        throw error;
      }
    };

    function recordPerformanceWithCD(startTime: number): void {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const message: PerformanceMessage = {
        type: 'performance',
        class: className,
        method: methodName,
        duration,
        file: options?.file,
        changeDetectionCount: cdTracker.getCount(className)
      };

      xrayClient.send(message);
    }

    return descriptor;
  };
}
