import * as fs from "fs";
import * as vscode from "vscode";
import { AIPromptGenerator } from "./ai/promptGenerator";
import { ProbeSetupManager } from "./commands/setupProbe";
import { SnapshotCaptureManager } from "./storage/captureManager";
import { SnapshotStorageManager } from "./storage/snapshotManager";
import {
  MethodPerformanceData,
  NativeModule,
  PerformanceMessage,
  PerformanceMessageV2,
} from "./types";
import { ConnectionStatus, StatusBarManager } from "./ui/statusBar";
import { CallStackBuilder } from "./visualization/callStackBuilder";
import { PerformanceCodeLensProvider } from "./visualization/codeLensProvider";
import { ComparisonViewProvider } from "./visualization/comparisonView";
import { DecorationManager } from "./visualization/decorationManager";
import { FlameGraphViewProvider } from "./visualization/flameGraphView";
import { XRayWebSocketServer } from "./websocket/server";
import { PortManager } from "./websocket/portManager";

// Import the native Rust module
let nativeModule: NativeModule;
try {
  nativeModule = require("../native/index.node");
  console.log("Native module loaded successfully");
  console.log("Available functions:", Object.keys(nativeModule));
} catch (error) {
  console.error("Failed to load native module:", error);
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Angular X-Ray");
  outputChannel.appendLine("Angular Runtime X-Ray extension activated");

  // Initialize UI components
  const statusBarManager = new StatusBarManager();
  const portManager = new PortManager();
  const probeSetupManager = new ProbeSetupManager(outputChannel, portManager);

  // Initialize existing components
  const wsServer = new XRayWebSocketServer(outputChannel, portManager);
  const decorationManager = new DecorationManager(outputChannel);
  const codeLensProvider = new PerformanceCodeLensProvider();
  const promptGenerator = new AIPromptGenerator();

  // Update status bar when server starts
  statusBarManager.updateStatus(ConnectionStatus.Connecting);

  // Initialize NEW components
  const storageManager = new SnapshotStorageManager(context, nativeModule);
  const captureManager = new SnapshotCaptureManager();
  const callStackBuilder = new CallStackBuilder();
  const flameGraphProvider = new FlameGraphViewProvider(
    context.extensionUri,
    nativeModule,
  );

  // Wire up dependencies for flame graph auto-refresh
  flameGraphProvider.setCallStackBuilder(callStackBuilder);
  flameGraphProvider.setCaptureManager(captureManager);
  const comparisonProvider = new ComparisonViewProvider(
    context.extensionUri,
    nativeModule,
    storageManager,
  );

  // Store performance data
  const performanceStore = new Map<string, MethodPerformanceData>();

  // Start WebSocket server with status updates
  wsServer
    .start()
    .then(() => {
      const port = portManager.getCurrentPort();
      // Update status bar when server is ready
      setTimeout(() => {
        statusBarManager.updateStatus(ConnectionStatus.Connected, {
          clientCount: 0,
          port,
        });
      }, 1000);
    })
    .catch((error) => {
      statusBarManager.updateStatus(ConnectionStatus.Error);
      vscode.window.showErrorMessage(
        `Failed to start WebSocket server: ${error}`,
      );
    });

  // Listen for WebSocket events to update status
  wsServer.onClientConnected(() => {
    const clientCount = wsServer.getClientCount();
    const port = portManager.getCurrentPort();
    statusBarManager.updateStatus(ConnectionStatus.Connected, {
      clientCount,
      port,
    });
    outputChannel.appendLine(`Client connected. Total clients: ${clientCount}`);
  });

  wsServer.onClientDisconnected(() => {
    const clientCount = wsServer.getClientCount();
    const port = portManager.getCurrentPort();
    statusBarManager.updateStatus(ConnectionStatus.Connected, {
      clientCount,
      port,
    });
    outputChannel.appendLine(
      `Client disconnected. Total clients: ${clientCount}`,
    );
  });

  wsServer.onError((error) => {
    statusBarManager.updateStatus(ConnectionStatus.Error);
    outputChannel.appendLine(`WebSocket error: ${error}`);
  });

  // Register CodeLens provider for TypeScript files
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    { language: "typescript", scheme: "file" },
    codeLensProvider,
  );

  // Register NEW webview providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FlameGraphViewProvider.viewType,
      flameGraphProvider,
    ),
    vscode.window.registerWebviewViewProvider(
      ComparisonViewProvider.viewType,
      comparisonProvider,
    ),
  );

  // Handle incoming performance messages
  wsServer.onMessage((message: PerformanceMessage | any) => {
    // Update status bar with data received
    statusBarManager.recordDataReceived();

    // Handle batch messages
    if (message.type === "batch" && message.messages) {
      message.messages.forEach((msg: PerformanceMessage) => {
        handlePerformanceMessage(msg, outputChannel);
      });
    } else {
      handlePerformanceMessage(message, outputChannel);
    }
  });

  // Register AI analysis command
  const analyzeCommand = vscode.commands.registerCommand(
    "angularXray.analyzeWithAI",
    async (encodedData?: string) => {
      try {
        let className: string | undefined;
        let methodName: string | undefined;

        // Try to decode data from argument
        if (encodedData && typeof encodedData === "string") {
          try {
            const decoded = JSON.parse(
              Buffer.from(encodedData, "base64").toString("utf-8"),
            );
            className = decoded.className;
            methodName = decoded.methodName;
            outputChannel.appendLine(
              `[AI Analysis] Decoded from argument: ${className}.${methodName}`,
            );
          } catch (e) {
            outputChannel.appendLine(
              `[AI Analysis] Failed to decode argument: ${e}`,
            );
            encodedData = undefined;
          }
        }

        // Fallback: Find data from current file and show quick pick
        if (!encodedData) {
          outputChannel.appendLine(
            `[AI Analysis] No argument received, searching from active editor`,
          );

          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showErrorMessage("No active editor found");
            return;
          }

          const filePath = editor.document.uri.fsPath;
          const availableData: MethodPerformanceData[] = [];

          // Find all performance data for current file
          for (const [key, data] of performanceStore) {
            if (data.filePath === filePath && data.line) {
              availableData.push(data);
            }
          }

          if (availableData.length === 0) {
            vscode.window.showErrorMessage(
              `No performance data found for ${filePath}`,
            );
            return;
          }

          // Show quick pick if multiple methods
          if (availableData.length === 1) {
            className = availableData[0].className;
            methodName = availableData[0].methodName;
          } else {
            const items = availableData.map((d) => ({
              label: `${d.className}.${d.methodName}`,
              description: `Line ${d.line}: ${d.averageDuration.toFixed(2)}ms avg`,
              data: d,
            }));

            const selected = await vscode.window.showQuickPick(items, {
              placeHolder: "Select method to analyze",
            });

            if (!selected) {
              return;
            }

            className = selected.data.className;
            methodName = selected.data.methodName;
          }

          outputChannel.appendLine(
            `[AI Analysis] Selected from file: ${className}.${methodName}`,
          );
        }

        // Validate we have className and methodName
        if (!className || !methodName) {
          outputChannel.appendLine(
            `[AI Analysis] Missing className or methodName`,
          );
          vscode.window.showErrorMessage(
            "Cannot analyze: Missing method information",
          );
          return;
        }

        // Debug logging
        outputChannel.appendLine(
          `[AI Analysis] Analyzing: ${className}.${methodName}`,
        );
        outputChannel.appendLine(
          `[AI Analysis] PerformanceStore keys: ${Array.from(performanceStore.keys()).join(", ")}`,
        );

        // Find data in performanceStore using className.methodName as key
        const key = `${className}.${methodName}`;
        const data = performanceStore.get(key);

        if (!data) {
          outputChannel.appendLine(
            `[AI Analysis] No data found for key: ${key}`,
          );
          vscode.window.showErrorMessage(
            `Cannot analyze ${className}.${methodName}: No performance data found. ` +
              `Make sure the method has been executed at least once.`,
          );
          return;
        }

        // Validate that we have location information
        if (!data.filePath || !data.line) {
          outputChannel.appendLine(
            `[AI Analysis] Data found but missing location: filePath=${data.filePath}, line=${data.line}`,
          );
          vscode.window.showErrorMessage(
            `Cannot analyze ${className}.${methodName}: Location information missing. ` +
              `Try re-running your Angular app to collect fresh data.`,
          );
          return;
        }

        outputChannel.appendLine(
          `[AI Analysis] Found data: ${data.filePath}:${data.line}`,
        );

        const prompt = await promptGenerator.generatePrompt(data);
        await promptGenerator.copyToClipboard(prompt);

        vscode.window.showInformationMessage(
          `AI analysis prompt for ${data.className}.${data.methodName} copied to clipboard!`,
        );
      } catch (error) {
        outputChannel.appendLine(
          `[AI Analysis] Error: ${error instanceof Error ? error.stack : error}`,
        );
        vscode.window.showErrorMessage(
          `Failed to generate AI prompt: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
  );

  // Register NEW commands
  const setupProbeCommand = vscode.commands.registerCommand(
    "angularXray.setupProbe",
    async () => {
      await probeSetupManager.setupProbe();
    },
  );

  const showStatusCommand = vscode.commands.registerCommand(
    "angularXray.showStatus",
    async () => {
      await statusBarManager.showStatusDetails();
    },
  );

  const startCaptureCommand = vscode.commands.registerCommand(
    "angularXray.startCapture",
    async () => {
      captureManager.startCapture();
      vscode.window.showInformationMessage(
        "Performance capture started. Run your Angular app to collect data.",
      );
    },
  );

  const stopCaptureCommand = vscode.commands.registerCommand(
    "angularXray.stopCapture",
    async () => {
      if (!captureManager.isCaptureActive()) {
        vscode.window.showWarningMessage("No active capture session.");
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: "Enter snapshot name",
        placeHolder: "e.g., After optimization",
      });

      if (name) {
        try {
          await captureManager.stopCapture(name, storageManager);
          vscode.window.showInformationMessage(
            `Snapshot '${name}' saved successfully!`,
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to save snapshot: ${error}`);
        }
      }
    },
  );

  const showFlameGraphCommand = vscode.commands.registerCommand(
    "angularXray.showFlameGraph",
    async () => {
      const callStacks = callStackBuilder.buildCallTree();
      if (callStacks.length === 0) {
        vscode.window.showWarningMessage(
          "No performance data available. Run your Angular app with @TrackPerformance() decorators.",
        );
        return;
      }

      await flameGraphProvider.updateFlameGraph(callStacks);
      vscode.window.showInformationMessage(
        `Flame graph updated with ${callStackBuilder.getCallCount()} calls.`,
      );
    },
  );

  const compareSnapshotsCommand = vscode.commands.registerCommand(
    "angularXray.compareSnapshots",
    async () => {
      const snapshots = await storageManager.listSnapshots();

      if (snapshots.length < 2) {
        vscode.window.showWarningMessage(
          "Need at least 2 snapshots to compare. Create snapshots using Start/Stop Capture.",
        );
        return;
      }

      const baseline = await vscode.window.showQuickPick(
        snapshots.map((s) => ({
          label: s.name,
          description: new Date(s.timestamp).toLocaleString(),
          detail: s.gitBranch ? `${s.gitBranch}@${s.gitCommit}` : undefined,
          id: s.id,
        })),
        { placeHolder: "Select baseline snapshot" },
      );

      if (!baseline) return;

      const current = await vscode.window.showQuickPick(
        snapshots
          .filter((s) => s.id !== baseline.id)
          .map((s) => ({
            label: s.name,
            description: new Date(s.timestamp).toLocaleString(),
            detail: s.gitBranch ? `${s.gitBranch}@${s.gitCommit}` : undefined,
            id: s.id,
          })),
        { placeHolder: "Select current snapshot to compare" },
      );

      if (!current) return;

      try {
        await comparisonProvider.compareSnapshots(baseline.id, current.id);
        vscode.window.showInformationMessage(
          `Comparing '${baseline.label}' vs '${current.label}'`,
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to compare snapshots: ${error}`);
      }
    },
  );

  const manageSnapshotsCommand = vscode.commands.registerCommand(
    "angularXray.manageSnapshots",
    async () => {
      const snapshots = await storageManager.listSnapshots();
      const stats = await storageManager.getStorageStats();

      if (snapshots.length === 0) {
        vscode.window.showInformationMessage("No snapshots saved yet.");
        return;
      }

      const items = snapshots.map((s) => ({
        label: s.name,
        description: new Date(s.timestamp).toLocaleString(),
        detail: s.gitBranch ? `${s.gitBranch}@${s.gitCommit}` : undefined,
        id: s.id,
      }));

      items.unshift({
        label: `📊 Storage Stats`,
        description: `${snapshots.length} snapshots, ${(stats.totalSize / 1024).toFixed(1)}KB`,
        detail: "Select a snapshot below to delete it",
        id: "",
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select snapshot to delete (or ESC to cancel)",
      });

      if (selected && selected.id) {
        const confirm = await vscode.window.showWarningMessage(
          `Delete snapshot '${selected.label}'?`,
          { modal: true },
          "Delete",
        );

        if (confirm === "Delete") {
          try {
            await storageManager.deleteSnapshot(selected.id);
            vscode.window.showInformationMessage(
              `Snapshot '${selected.label}' deleted.`,
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to delete snapshot: ${error}`,
            );
          }
        }
      }
    },
  );

  // Handle active editor changes
  vscode.window.onDidChangeActiveTextEditor(() => {
    decorationManager.onActiveEditorChange();
  });

  // Server control commands
  const restartServerCommand = vscode.commands.registerCommand(
    "angularXray.restartServer",
    async () => {
      try {
        wsServer.stop();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await wsServer.start();
        const port = portManager.getCurrentPort();
        statusBarManager.updateStatus(ConnectionStatus.Connected, {
          clientCount: 0,
          port,
        });
        vscode.window.showInformationMessage(
          `WebSocket server restarted on port ${port}`,
        );
      } catch (error) {
        statusBarManager.updateStatus(ConnectionStatus.Error);
        vscode.window.showErrorMessage(`Failed to restart server: ${error}`);
      }
    },
  );

  const stopServerCommand = vscode.commands.registerCommand(
    "angularXray.stopServer",
    () => {
      wsServer.stop();
      statusBarManager.updateStatus(ConnectionStatus.Disconnected);
      vscode.window.showInformationMessage("WebSocket server stopped");
    },
  );

  const startServerCommand = vscode.commands.registerCommand(
    "angularXray.startServer",
    async () => {
      try {
        await wsServer.start();
        const port = portManager.getCurrentPort();
        statusBarManager.updateStatus(ConnectionStatus.Connected, {
          clientCount: 0,
          port,
        });
        vscode.window.showInformationMessage(
          `WebSocket server started on port ${port}`,
        );
      } catch (error) {
        statusBarManager.updateStatus(ConnectionStatus.Error);
        vscode.window.showErrorMessage(`Failed to start server: ${error}`);
      }
    },
  );

  // Add disposables
  context.subscriptions.push(
    outputChannel,
    codeLensDisposable,
    analyzeCommand,
    setupProbeCommand,
    showStatusCommand,
    startCaptureCommand,
    stopCaptureCommand,
    showFlameGraphCommand,
    compareSnapshotsCommand,
    manageSnapshotsCommand,
    restartServerCommand,
    stopServerCommand,
    startServerCommand,
    { dispose: () => wsServer.stop() },
    { dispose: () => decorationManager.dispose() },
    { dispose: () => codeLensProvider.dispose() },
    { dispose: () => statusBarManager.dispose() },
  );

  /**
   * Handle incoming performance message
   */
  async function handlePerformanceMessage(
    message: PerformanceMessage,
    outputChannel: vscode.OutputChannel,
  ): Promise<void> {
    try {
      // Get workspace path
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        outputChannel.appendLine("No workspace folder found");
        return;
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;

      // Phase 1: Locate the file
      let filePath: string | undefined = message.file;

      if (!filePath) {
        // Use Rust native module to find the file
        if (!nativeModule) {
          outputChannel.appendLine(
            "Native module not loaded, cannot locate file",
          );
          return;
        }

        try {
          // Try original class name first
          let result = nativeModule.locateFile(message.class, workspacePath);

          // If not found and class name starts with underscore, try without it
          if (!result.found && message.class.startsWith("_")) {
            const classNameWithoutUnderscore = message.class.substring(1);
            outputChannel.appendLine(
              `Retrying without underscore: ${classNameWithoutUnderscore}`,
            );
            result = nativeModule.locateFile(
              classNameWithoutUnderscore,
              workspacePath,
            );
          }

          if (result.found) {
            filePath = result.filePath;
            outputChannel.appendLine(`Located file: ${filePath}`);
          } else {
            outputChannel.appendLine(
              `File not found for class: ${message.class} - will track without location`,
            );
          }
        } catch (error) {
          outputChannel.appendLine(
            `Error locating file: ${error} - will track without location`,
          );
        }
      }

      // Phase 2: Parse the file to find the method line
      let methodLine: number | undefined;

      if (filePath) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");

          // Try original method name first
          let result = nativeModule.parseMethod(fileContent, message.method);

          // If not found and method name starts with underscore, try without it
          if (!result.found && message.method.startsWith("_")) {
            const methodNameWithoutUnderscore = message.method.substring(1);
            outputChannel.appendLine(
              `Retrying method without underscore: ${methodNameWithoutUnderscore}`,
            );
            result = nativeModule.parseMethod(
              fileContent,
              methodNameWithoutUnderscore,
            );
          }

          if (result.found) {
            methodLine = result.line;
            outputChannel.appendLine(
              `Found method ${message.method} at line ${methodLine}`,
            );
          } else {
            outputChannel.appendLine(
              `Method ${message.method} not found in ${filePath}`,
            );
          }
        } catch (error) {
          outputChannel.appendLine(`Error parsing method: ${error}`);
        }
      } else {
        outputChannel.appendLine(
          `Warning: No file path for ${message.class}.${message.method}`,
        );
      }

      // Update performance store
      const key = `${message.class}.${message.method}`;
      let perfData = performanceStore.get(key);

      if (!perfData) {
        perfData = {
          className: message.class,
          methodName: message.method,
          filePath,
          line: methodLine,
          executions: [],
          averageDuration: 0,
          lastDuration: message.duration,
          changeDetectionCount: message.changeDetectionCount,
        };
        performanceStore.set(key, perfData);
      } else {
        // **KEY FIX**: Preserve filePath/line once set - never overwrite with undefined
        if (filePath && methodLine) {
          perfData.filePath = filePath;
          perfData.line = methodLine;
        }

        // Update execution data
        perfData.executions.push(message.duration);
        perfData.lastDuration = message.duration;
        perfData.averageDuration =
          perfData.executions.reduce((a, b) => a + b, 0) /
          perfData.executions.length;

        if (message.changeDetectionCount !== undefined) {
          perfData.changeDetectionCount = message.changeDetectionCount;
        }
      }

      // **Validate before updating UI** - prevent errors in CodeLens and AI analysis
      if (!perfData.filePath || !perfData.line) {
        outputChannel.appendLine(
          `Warning: ${message.class}.${message.method} has no location. Skipping UI update.`,
        );
        return;
      }

      // Update visualizations
      decorationManager.queueUpdate(perfData);
      codeLensProvider.updatePerformanceData(perfData);

      // NEW: Handle call stack tracking for flame graphs
      const msgV2 = message as any;
      if (msgV2.callId) {
        callStackBuilder.addCall(msgV2 as PerformanceMessageV2);
      }

      // NEW: Record data during active capture
      if (captureManager.isCaptureActive()) {
        captureManager.recordData(perfData);
      }
    } catch (error) {
      outputChannel.appendLine(`Error handling performance message: ${error}`);
    }
  }

  outputChannel.appendLine(
    "Angular X-Ray is ready to receive performance data",
  );
}

export function deactivate() {
  // Cleanup is handled by disposables
}
