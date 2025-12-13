/**
 * Angular Runtime X-Ray Probe
 *
 * This library should be imported into your Angular application
 * to enable real-time performance monitoring.
 *
 * Installation:
 * 1. Copy this probe folder to your Angular project
 * 2. Import the decorators in your components/services
 * 3. Apply @Performance() to methods you want to monitor
 *
 * Example:
 * ```typescript
 * import { Performance, TrackChangeDetection } from './probe';
 *
 * @Component({
 *   selector: 'app-my-component',
 *   templateUrl: './my-component.html'
 * })
 * export class MyComponent {
 *   @Performance()
 *   expensiveOperation() {
 *     // Your code here
 *   }
 *
 *   @TrackChangeDetection()
 *   ngDoCheck() {
 *     // Change detection tracking
 *   }
 * }
 * ```
 */

export {
  Performance,
  TrackChangeDetection,
  PerformanceWithCD,
  TrackPerformance,
  cdTracker,
  callStackManager,
} from "./decorator";
export { XRayWebSocketClient, xrayClient } from "./websocket-client";
