import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class ProbeSetupManager {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    async setupProbe(): Promise<void> {
        try {
            // Check if we're in a workspace
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('Please open a workspace or folder first.');
                return;
            }

            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

            // Check if it's an Angular project
            const isAngularProject = await this.isAngularProject(workspaceRoot);
            if (!isAngularProject) {
                const proceed = await vscode.window.showWarningMessage(
                    'This doesn\'t appear to be an Angular project. Continue anyway?',
                    'Yes', 'No'
                );
                if (proceed !== 'Yes') return;
            }

            // Ask user where to place the probe
            const probeLocation = await this.askProbeLocation(workspaceRoot);
            if (!probeLocation) return;

            // Create probe directory and files
            await this.createProbeFiles(probeLocation);

            // Show success message with next steps
            await this.showSuccessMessage(probeLocation);

            this.outputChannel.appendLine(`Angular X-Ray probe setup completed at: ${probeLocation}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to setup probe: ${errorMessage}`);
            this.outputChannel.appendLine(`Setup error: ${errorMessage}`);
        }
    }

    private async isAngularProject(workspaceRoot: string): Promise<boolean> {
        const packageJsonPath = path.join(workspaceRoot, 'package.json');
        const angularJsonPath = path.join(workspaceRoot, 'angular.json');

        try {
            // Check for angular.json
            if (fs.existsSync(angularJsonPath)) return true;

            // Check package.json for Angular dependencies
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                return !!(deps['@angular/core'] || deps['@angular/cli']);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error checking Angular project: ${error}`);
        }

        return false;
    }

    private async askProbeLocation(workspaceRoot: string): Promise<string | undefined> {
        const options: vscode.QuickPickItem[] = [
            {
                label: '$(folder) src/app/shared/angular-xray',
                description: 'Recommended: Shared utilities folder',
                detail: 'Creates probe in src/app/shared/angular-xray/'
            },
            {
                label: '$(folder) src/angular-xray',
                description: 'Alternative: Source root',
                detail: 'Creates probe in src/angular-xray/'
            },
            {
                label: '$(folder) libs/angular-xray',
                description: 'For Nx workspaces',
                detail: 'Creates probe in libs/angular-xray/'
            },
            {
                label: '$(edit) Custom location...',
                description: 'Choose your own path',
                detail: 'Browse for custom directory'
            }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Where would you like to install the Angular X-Ray probe?',
            ignoreFocusOut: true
        });

        if (!selected) return undefined;

        if (selected.label.includes('Custom location')) {
            const customUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode.Uri.file(workspaceRoot),
                openLabel: 'Select Probe Location'
            });

            if (customUri && customUri[0]) {
                return path.join(customUri[0].fsPath, 'angular-xray');
            }
            return undefined;
        }

        // Extract path from the selected option
        const pathMap: { [key: string]: string } = {
            'src/app/shared/angular-xray': path.join(workspaceRoot, 'src', 'app', 'shared', 'angular-xray'),
            'src/angular-xray': path.join(workspaceRoot, 'src', 'angular-xray'),
            'libs/angular-xray': path.join(workspaceRoot, 'libs', 'angular-xray')
        };

        for (const [key, value] of Object.entries(pathMap)) {
            if (selected.detail?.includes(key)) {
                return value;
            }
        }

        return path.join(workspaceRoot, 'src', 'app', 'shared', 'angular-xray');
    }

    private async createProbeFiles(probeLocation: string): Promise<void> {
        // Create directory if it doesn't exist
        if (!fs.existsSync(probeLocation)) {
            fs.mkdirSync(probeLocation, { recursive: true });
        }

        // Read template files
        const extensionPath = vscode.extensions.getExtension('angular-xray.angular-runtime-xray')?.extensionPath;
        if (!extensionPath) {
            throw new Error('Extension path not found');
        }

        const templateDir = path.join(extensionPath, 'src', 'templates');

        // Copy probe-decorator.ts
        const decoratorTemplate = path.join(templateDir, 'probe-decorator.ts');
        const decoratorTarget = path.join(probeLocation, 'probe-decorator.ts');

        if (fs.existsSync(decoratorTemplate)) {
            fs.copyFileSync(decoratorTemplate, decoratorTarget);
        } else {
            // Fallback: create from embedded template
            await this.createDecoratorFile(decoratorTarget);
        }

        // Copy index.ts
        const indexTemplate = path.join(templateDir, 'index.ts');
        const indexTarget = path.join(probeLocation, 'index.ts');

        if (fs.existsSync(indexTemplate)) {
            fs.copyFileSync(indexTemplate, indexTarget);
        } else {
            // Fallback: create from embedded template
            await this.createIndexFile(indexTarget);
        }

        // Create README.md with usage instructions
        await this.createReadmeFile(path.join(probeLocation, 'README.md'));
    }

    private async createDecoratorFile(filePath: string): Promise<void> {
        const content = `/**
 * Angular Runtime X-Ray Performance Decorators
 * Auto-generated by Angular Runtime X-Ray Extension
 */

export interface PerformanceData {
  className: string;
  methodName: string;
  executionTime: number;
  timestamp: number;
  args?: any[];
  result?: any;
}

// WebSocket client for communicating with VS Code extension
class XRayWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private url: string = 'ws://localhost:3333') {
    this.connect();
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('[Angular X-Ray] Connected to performance monitor');
        this.reconnectAttempts = 0;
      };

      this.ws.onclose = () => {
        console.log('[Angular X-Ray] Disconnected from performance monitor');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Angular X-Ray] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[Angular X-Ray] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(\`[Angular X-Ray] Reconnecting... (\${this.reconnectAttempts}/\${this.maxReconnectAttempts})\`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Global WebSocket client instance
const wsClient = new XRayWebSocketClient();

/**
 * Performance monitoring decorator
 * Tracks method execution time and sends data to VS Code extension
 */
export function Performance(options: { threshold?: number } = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const threshold = options.threshold || 0;

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();
      const className = target.constructor.name;

      try {
        const result = method.apply(this, args);

        // Handle both sync and async methods
        if (result && typeof result.then === 'function') {
          // Async method
          return result.then((asyncResult: any) => {
            const executionTime = performance.now() - startTime;
            if (executionTime >= threshold) {
              sendPerformanceData(className, propertyName, executionTime, args, asyncResult);
            }
            return asyncResult;
          }).catch((error: any) => {
            const executionTime = performance.now() - startTime;
            if (executionTime >= threshold) {
              sendPerformanceData(className, propertyName, executionTime, args, null, error);
            }
            throw error;
          });
        } else {
          // Sync method
          const executionTime = performance.now() - startTime;
          if (executionTime >= threshold) {
            sendPerformanceData(className, propertyName, executionTime, args, result);
          }
          return result;
        }
      } catch (error) {
        const executionTime = performance.now() - startTime;
        if (executionTime >= threshold) {
          sendPerformanceData(className, propertyName, executionTime, args, null, error);
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Change detection tracking decorator
 */
export function TrackChangeDetection() {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();
      const className = target.constructor.name;

      try {
        const result = method.apply(this, args);
        const executionTime = performance.now() - startTime;

        sendPerformanceData(className, propertyName, executionTime, args, result, null, 'change-detection');

        return result;
      } catch (error) {
        const executionTime = performance.now() - startTime;
        sendPerformanceData(className, propertyName, executionTime, args, null, error, 'change-detection');
        throw error;
      }
    };

    return descriptor;
  };
}

function sendPerformanceData(
  className: string,
  methodName: string,
  executionTime: number,
  args?: any[],
  result?: any,
  error?: any,
  type: string = 'performance'
): void {
  const data = {
    className,
    methodName,
    executionTime,
    timestamp: Date.now(),
    args: args?.length ? args : undefined,
    result: result !== undefined ? result : undefined,
    type,
    error: error ? error.message || error : undefined
  };

  wsClient.send(data);
}

// Export WebSocket client for manual usage if needed
export { wsClient as XRayClient };`;

        fs.writeFileSync(filePath, content, 'utf8');
    }

    private async createIndexFile(filePath: string): Promise<void> {
        const content = `/**
 * Angular Runtime X-Ray - Main Export
 * Auto-generated by Angular Runtime X-Ray Extension
 */

export { Performance, TrackChangeDetection, XRayClient } from './probe-decorator';

// Re-export types
export type { PerformanceData } from './probe-decorator';`;

        fs.writeFileSync(filePath, content, 'utf8');
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
    // This method will be monitored
    return this.heavyComputation();
  }

  @Performance({ threshold: 100 }) // Only track if > 100ms
  anotherMethod() {
    // Only tracked if execution time > 100ms
    return this.someOperation();
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

### Manual WebSocket Usage

\`\`\`typescript
import { XRayClient } from './angular-xray';

// Send custom performance data
XRayClient.send({
  type: 'custom',
  message: 'Custom performance event',
  data: { /* your data */ }
});
\`\`\`

## Features

- ✅ **Zero Configuration**: Works out of the box
- ✅ **Automatic Reconnection**: Handles connection drops gracefully  
- ✅ **Async Support**: Tracks both sync and async methods
- ✅ **Error Handling**: Captures errors with performance data
- ✅ **Threshold Control**: Only track methods above specified time
- ✅ **TypeScript Support**: Full type definitions included

## Generated by Angular Runtime X-Ray Extension
This probe was automatically generated. Do not modify manually - use the extension to regenerate if needed.
`;

        fs.writeFileSync(filePath, content, 'utf8');
    }

    private async showSuccessMessage(probeLocation: string): Promise<void> {
        const relativePath = vscode.workspace.asRelativePath(probeLocation);

        const message = `✅ Angular X-Ray probe installed successfully!

📁 Location: ${relativePath}

Next steps:
1. Import decorators in your components
2. Add @Performance() to methods you want to monitor
3. Run your Angular app (ng serve)
4. See performance data in VS Code!`;

        const action = await vscode.window.showInformationMessage(
            'Angular X-Ray probe setup completed!',
            'Show Usage Example',
            'Open Probe Folder'
        );

        if (action === 'Show Usage Example') {
            await this.showUsageExample();
        } else if (action === 'Open Probe Folder') {
            const uri = vscode.Uri.file(probeLocation);
            await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
        }
    }

    private async showUsageExample(): Promise<void> {
        const exampleCode = `import { Performance, TrackChangeDetection } from './angular-xray';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent {
  
  @Performance() // Track all executions
  loadData() {
    // Your expensive operation
    return this.dataService.fetchData();
  }

  @Performance({ threshold: 50 }) // Only track if > 50ms
  processData(data: any[]) {
    return data.map(item => this.transform(item));
  }

  @TrackChangeDetection()
  ngDoCheck() {
    // Monitor change detection performance
  }
}`;

        const doc = await vscode.workspace.openTextDocument({
            content: exampleCode,
            language: 'typescript'
        });

        await vscode.window.showTextDocument(doc);
    }
}
