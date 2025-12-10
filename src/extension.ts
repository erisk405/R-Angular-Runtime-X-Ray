import * as fs from "fs";
import * as vscode from "vscode";
import { AIPromptGenerator } from "./ai/promptGenerator";
import { SnapshotCaptureManager } from "./storage/captureManager";
import { SnapshotStorageManager } from "./storage/snapshotManager";
import {
  MethodPerformanceData,
  NativeModule,
  PerformanceMessage,
  PerformanceMessageV2,
} from "./types";
import { CallStackBuilder } from "./visualization/callStackBuilder";
import { PerformanceCodeLensProvider } from "./visualization/codeLensProvider";
import { ComparisonViewProvider } from "./visualization/comparisonView";
import { DecorationManager } from "./visualization/decorationManager";
import { FlameGraphViewProvider } from "./visualization/flameGraphView";
import { XRayWebSocketServer } from "./websocket/server";

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

  // Initialize existing components
  const wsServer = new XRayWebSocketServer(outputChannel);
  const decorationManager = new DecorationManager(outputChannel);
  const codeLensProvider = new PerformanceCodeLensProvider();
  const promptGenerator = new AIPromptGenerator();

  // Initialize NEW components
  const storageManager = new SnapshotStorageManager(context, nativeModule);
  const captureManager = new SnapshotCaptureManager();
  const callStackBuilder = new CallStackBuilder();
  const flameGraphProvider = new FlameGraphViewProvider(
    context.extensionUri,
    nativeModule,
  );
  const comparisonProvider = new ComparisonViewProvider(
    context.extensionUri,
    nativeModule,
    storageManager,
  );

  // Store performance data
  const performanceStore = new Map<string, MethodPerformanceData>();

  // Start WebSocket server
  wsServer.start();

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
    async (data: MethodPerformanceData) => {
      try {
        const prompt = await promptGenerator.generatePrompt(data);
        await promptGenerator.copyToClipboard(prompt);

        vscode.window.showInformationMessage(
          `AI analysis prompt for ${data.className}.${data.methodName} copied to clipboard!`,
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate AI prompt: ${error}`,
        );
      }
    },
  );

  // Register NEW commands
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

  // Add disposables
  context.subscriptions.push(
    outputChannel,
    codeLensDisposable,
    analyzeCommand,
    startCaptureCommand,
    stopCaptureCommand,
    showFlameGraphCommand,
    compareSnapshotsCommand,
    manageSnapshotsCommand,
    { dispose: () => wsServer.stop() },
    { dispose: () => decorationManager.dispose() },
    { dispose: () => codeLensProvider.dispose() },
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
              `File not found for class: ${message.class}`,
            );
            return;
          }
        } catch (error) {
          outputChannel.appendLine(`Error locating file: ${error}`);
          return;
        }
      }

      // Phase 2: Parse the file to find the method line
      let methodLine: number | undefined;

      try {
        if (!filePath) {
          outputChannel.appendLine(`File path is undefined`);
          return;
        }
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
          return;
        }
      } catch (error) {
        outputChannel.appendLine(`Error parsing method: ${error}`);
        return;
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
