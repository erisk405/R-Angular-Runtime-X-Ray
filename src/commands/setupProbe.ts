import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { PortManager } from "../websocket/portManager";

export class ProbeSetupManager {
  private outputChannel: vscode.OutputChannel;

  constructor(
    outputChannel: vscode.OutputChannel,
    private portManager: PortManager,
  ) {
    this.outputChannel = outputChannel;
  }

  async setupProbe(): Promise<void> {
    try {
      // Check if we're in a workspace
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        vscode.window.showErrorMessage(
          "Please open a workspace or folder first.",
        );
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // Check if it's an Angular project
      const isAngularProject = await this.isAngularProject(workspaceRoot);
      if (!isAngularProject) {
        const proceed = await vscode.window.showWarningMessage(
          "This doesn't appear to be an Angular project. Continue anyway?",
          "Yes",
          "No",
        );
        if (proceed !== "Yes") return;
      }

      // Ask user where to place the probe
      const probeLocation = await this.askProbeLocation(workspaceRoot);
      if (!probeLocation) return;

      // Get port to use
      const port = this.portManager.getConfiguredPort();

      // Create probe directory and files
      await this.createProbeFiles(probeLocation, port);

      // Show success message with next steps
      await this.showSuccessMessage(probeLocation);

      this.outputChannel.appendLine(
        `Angular X-Ray probe setup completed at: ${probeLocation}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to setup probe: ${errorMessage}`);
      this.outputChannel.appendLine(`Setup error: ${errorMessage}`);
    }
  }

  private async isAngularProject(workspaceRoot: string): Promise<boolean> {
    const packageJsonPath = path.join(workspaceRoot, "package.json");
    const angularJsonPath = path.join(workspaceRoot, "angular.json");

    try {
      // Check for angular.json
      if (fs.existsSync(angularJsonPath)) return true;

      // Check package.json for Angular dependencies
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8"),
        );
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        return !!(deps["@angular/core"] || deps["@angular/cli"]);
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error checking Angular project: ${error}`);
    }

    return false;
  }

  private async askProbeLocation(
    workspaceRoot: string,
  ): Promise<string | undefined> {
    const options: vscode.QuickPickItem[] = [
      {
        label: "$(folder) src/app/shared/angular-xray",
        description: "Recommended: Shared utilities folder",
        detail: "Creates probe in src/app/shared/angular-xray/",
      },
      {
        label: "$(folder) src/angular-xray",
        description: "Alternative: Source root",
        detail: "Creates probe in src/angular-xray/",
      },
      {
        label: "$(folder) libs/angular-xray",
        description: "For Nx workspaces",
        detail: "Creates probe in libs/angular-xray/",
      },
      {
        label: "$(edit) Custom location...",
        description: "Choose your own path",
        detail: "Browse for custom directory",
      },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Where would you like to install the Angular X-Ray probe?",
      ignoreFocusOut: true,
    });

    if (!selected) return undefined;

    if (selected.label.includes("Custom location")) {
      const customUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(workspaceRoot),
        openLabel: "Select Probe Location",
      });

      if (customUri && customUri[0]) {
        return path.join(customUri[0].fsPath, "angular-xray");
      }
      return undefined;
    }

    // Extract path from the selected option
    const pathMap: { [key: string]: string } = {
      "src/app/shared/angular-xray": path.join(
        workspaceRoot,
        "src",
        "app",
        "shared",
        "angular-xray",
      ),
      "src/angular-xray": path.join(workspaceRoot, "src", "angular-xray"),
      "libs/angular-xray": path.join(workspaceRoot, "libs", "angular-xray"),
    };

    for (const [key, value] of Object.entries(pathMap)) {
      if (selected.detail?.includes(key)) {
        return value;
      }
    }

    return path.join(workspaceRoot, "src", "app", "shared", "angular-xray");
  }

  private async createProbeFiles(
    probeLocation: string,
    port: number,
  ): Promise<void> {
    // Create directory if it doesn't exist
    if (!fs.existsSync(probeLocation)) {
      fs.mkdirSync(probeLocation, { recursive: true });
    }

    // Generate all 5 files
    await this.createDecoratorFile(path.join(probeLocation, "decorator.ts"));
    await this.createWebSocketClientFile(
      path.join(probeLocation, "websocket-client.ts"),
      port,
    );
    await this.createIndexFile(path.join(probeLocation, "index.ts"));
    await this.createTsConfigFile(path.join(probeLocation, "tsconfig.json"));
    await this.createReadmeFile(path.join(probeLocation, "README.md"));
  }

  private async createDecoratorFile(filePath: string): Promise<void> {
    const content = `import { xrayClient } from "./websocket-client";

/**
 * Performance message structure
 */
interface PerformanceMessage {
  type: "performance";
  class: string;
  method: string;
  duration: number;
  file?: string;
  changeDetectionCount?: number;
}

/**
 * Enhanced performance message with call stack tracking (V2)
 */
interface PerformanceMessageV2 extends PerformanceMessage {
  callId: string;
  parentCallId?: string;
  timestamp: number;
  stackDepth: number;
}

/**
 * Call stack manager for tracking hierarchical method calls
 */
class CallStackManager {
  private callStack: string[] = [];
  private callIdCounter = 0;

  /**
   * Generate unique call ID
   */
  public generateCallId(): string {
    return \`call_\${Date.now()}_\${this.callIdCounter++}\`;
  }

  /**
   * Get the current parent call ID
   */
  public getCurrentParent(): string | undefined {
    return this.callStack[this.callStack.length - 1];
  }

  /**
   * Push a new call onto the stack
   */
  public pushCall(callId: string): void {
    this.callStack.push(callId);
  }

  /**
   * Pop a call from the stack
   */
  public popCall(): void {
    this.callStack.pop();
  }

  /**
   * Get current stack depth
   */
  public getDepth(): number {
    return this.callStack.length;
  }
}

export const callStackManager = new CallStackManager();

/**
 * Performance decorator for tracking method execution time
 */
export function Performance(options?: { file?: string }): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();

      try {
        const result = originalMethod.apply(this, args);

        if (result && typeof result.then === "function") {
          return result.then(
            (value: any) => {
              recordPerformance(startTime);
              return value;
            },
            (error: any) => {
              recordPerformance(startTime);
              throw error;
            },
          );
        }

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
        type: "performance",
        class: className,
        method: methodName,
        duration,
        file: options?.file,
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

  public trackCycle(componentName: string): void {
    const count = this.componentCounts.get(componentName) || 0;
    this.componentCounts.set(componentName, count + 1);
  }

  public getCount(componentName: string): number {
    return this.componentCounts.get(componentName) || 0;
  }

  public resetCount(componentName: string): void {
    this.componentCounts.set(componentName, 0);
  }

  public clearAll(): void {
    this.componentCounts.clear();
  }
}

export const cdTracker = new ChangeDetectionTracker();

/**
 * Decorator for tracking Angular change detection cycles
 */
export function TrackChangeDetection(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const componentName = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      cdTracker.trackCycle(componentName);
      const result = originalMethod.apply(this, args);

      const count = cdTracker.getCount(componentName);
      if (count % 10 === 0) {
        const message: PerformanceMessage = {
          type: "performance",
          class: componentName,
          method: "ngDoCheck",
          duration: 0,
          changeDetectionCount: count,
        };
        xrayClient.send(message);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Enhanced Performance decorator with change detection tracking
 */
export function PerformanceWithCD(options?: { file?: string }): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();

      try {
        const result = originalMethod.apply(this, args);

        if (result && typeof result.then === "function") {
          return result.then(
            (value: any) => {
              recordPerformanceWithCD(startTime);
              return value;
            },
            (error: any) => {
              recordPerformanceWithCD(startTime);
              throw error;
            },
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
        type: "performance",
        class: className,
        method: methodName,
        duration,
        file: options?.file,
        changeDetectionCount: cdTracker.getCount(className),
      };

      xrayClient.send(message);
    }

    return descriptor;
  };
}

/**
 * TrackPerformance decorator with call stack tracking for flame graphs
 */
export function TrackPerformance(options?: { file?: string }): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = function (...args: any[]) {
      const callId = callStackManager.generateCallId();
      const parentCallId = callStackManager.getCurrentParent();
      const stackDepth = callStackManager.getDepth();
      const timestamp = Date.now();

      callStackManager.pushCall(callId);
      const startTime = performance.now();

      try {
        const result = originalMethod.apply(this, args);

        if (result && typeof result.then === "function") {
          return result.then(
            (value: any) => {
              recordPerformanceV2(startTime, callId, parentCallId, stackDepth, timestamp);
              callStackManager.popCall();
              return value;
            },
            (error: any) => {
              recordPerformanceV2(startTime, callId, parentCallId, stackDepth, timestamp);
              callStackManager.popCall();
              throw error;
            },
          );
        }

        recordPerformanceV2(startTime, callId, parentCallId, stackDepth, timestamp);
        callStackManager.popCall();
        return result;

      } catch (error) {
        recordPerformanceV2(startTime, callId, parentCallId, stackDepth, timestamp);
        callStackManager.popCall();
        throw error;
      }
    };

    function recordPerformanceV2(
      startTime: number,
      callId: string,
      parentCallId: string | undefined,
      stackDepth: number,
      timestamp: number,
    ): void {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const message: PerformanceMessageV2 = {
        type: "performance",
        class: className,
        method: methodName,
        duration,
        file: options?.file,
        callId,
        parentCallId,
        stackDepth,
        timestamp,
      };

      xrayClient.send(message);
    }

    return descriptor;
  };
}
`;

    fs.writeFileSync(filePath, content, "utf8");
  }

  private async createWebSocketClientFile(
    filePath: string,
    port: number,
  ): Promise<void> {
    const content = `/**
 * WebSocket client for the Runtime Probe
 * Port configured in VS Code settings: ${port}
 */
export class XRayWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private readonly WS_URL = "ws://localhost:${port}";
  private readonly RECONNECT_INTERVAL = 3000;

  private messageQueue: any[] = [];
  private batchTimer: number | null = null;
  private readonly BATCH_INTERVAL = 100;
  private readonly MAX_BATCH_SIZE = 50;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log("[Angular X-Ray] Connected to performance monitor");
        this.clearReconnectTimer();
      };

      this.ws.onclose = () => {
        console.log("[Angular X-Ray] Disconnected from performance monitor");
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("[Angular X-Ray] WebSocket error:", error);
      };
    } catch (error) {
      console.error("[Angular X-Ray] Failed to create WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      console.log("[Angular X-Ray] Attempting to reconnect...");
      this.reconnectTimer = null;
      this.connect();
    }, this.RECONNECT_INTERVAL);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public send(message: any): void {
    this.messageQueue.push(message);

    if (this.messageQueue.length >= this.MAX_BATCH_SIZE) {
      this.flushQueue();
    } else if (!this.batchTimer) {
      this.batchTimer = window.setTimeout(() => {
        this.flushQueue();
      }, this.BATCH_INTERVAL);
    }
  }

  private flushQueue(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (
      this.messageQueue.length > 0 &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "batch",
            messages: this.messageQueue,
          }),
        );
        this.messageQueue = [];
      } catch (error) {
        console.error("[Angular X-Ray] Failed to send batch:", error);
      }
    }
  }

  public disconnect(): void {
    this.flushQueue();
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const xrayClient = new XRayWebSocketClient();
`;

    fs.writeFileSync(filePath, content, "utf8");
  }

  private async createIndexFile(filePath: string): Promise<void> {
    const content = `export {
  Performance,
  TrackChangeDetection,
  PerformanceWithCD,
  TrackPerformance,
  cdTracker,
  callStackManager,
} from "./decorator";
export { XRayWebSocketClient, xrayClient } from "./websocket-client";
`;

    fs.writeFileSync(filePath, content, "utf8");
  }

  private async createTsConfigFile(filePath: string): Promise<void> {
    const content = {
      compilerOptions: {
        target: "ES2020",
        module: "ES2020",
        lib: ["ES2020", "DOM"],
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        outDir: "./dist",
        rootDir: "./",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        moduleResolution: "node",
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
      include: ["./**/*"],
      exclude: ["node_modules", "dist"],
    };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf8");
  }

  private async createReadmeFile(filePath: string): Promise<void> {
    const content = `# Angular Runtime X-Ray Probe

This folder contains the performance monitoring probe for Angular Runtime X-Ray.

## Usage

### Basic Performance Monitoring

\`\`\`typescript
import { Performance } from './angular-xray';

@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.html'
})
export class MyComponent {
  @Performance()
  expensiveMethod() {
    return this.heavyComputation();
  }

  @Performance({ threshold: 100 })
  anotherMethod() {
    return this.someOperation();
  }
}
\`\`\`

### TrackPerformance for Flame Graphs

\`\`\`typescript
import { TrackPerformance } from './angular-xray';

@Component({...})
export class MyComponent {
  @TrackPerformance()
  complexOperation() {
    // This will appear in flame graphs with call hierarchy
    return this.process();
  }
}
\`\`\`

### Change Detection Monitoring

\`\`\`typescript
import { TrackChangeDetection } from './angular-xray';

@Component({...})
export class MyComponent {
  @TrackChangeDetection()
  ngDoCheck() {
    // Track change detection cycles
  }
}
\`\`\`

## Available Decorators

- **@Performance()** - Basic performance tracking
- **@TrackPerformance()** - Advanced tracking with flame graph support
- **@TrackChangeDetection()** - Monitor change detection cycles
- **@PerformanceWithCD()** - Combined performance + change detection

## Features

- ✅ **Zero Configuration**: Works out of the box
- ✅ **Automatic Reconnection**: Handles connection drops gracefully
- ✅ **Message Batching**: Optimized performance (100ms batches, max 50 messages)
- ✅ **Async Support**: Tracks both sync and async methods
- ✅ **Flame Graph Support**: Call stack tracking with @TrackPerformance()
- ✅ **TypeScript Support**: Full type definitions included

## Generated by Angular Runtime X-Ray Extension
This probe was automatically generated. Do not modify manually - use the extension to regenerate if needed.
`;

    fs.writeFileSync(filePath, content, "utf8");
  }

  private async showSuccessMessage(probeLocation: string): Promise<void> {
    const relativePath = vscode.workspace.asRelativePath(probeLocation);

    const action = await vscode.window.showInformationMessage(
      "Angular X-Ray probe setup completed!",
      "Show Usage Example",
      "Open Probe Folder",
    );

    if (action === "Show Usage Example") {
      await this.showUsageExample();
    } else if (action === "Open Probe Folder") {
      const uri = vscode.Uri.file(probeLocation);
      await vscode.commands.executeCommand("revealFileInOS", uri);
    }
  }

  private async showUsageExample(): Promise<void> {
    const exampleCode = `import { Performance, TrackPerformance } from './angular-xray';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent {

  @Performance()
  loadData() {
    return this.dataService.fetchData();
  }

  @TrackPerformance({ file: __filename })
  processData(data: any[]) {
    return data.map(item => this.transform(item));
  }
}`;

    const doc = await vscode.workspace.openTextDocument({
      content: exampleCode,
      language: "typescript",
    });

    await vscode.window.showTextDocument(doc);
  }
}
