import * as fs from "fs";
import * as vscode from "vscode";
import { AIPromptGenerator } from "./ai/promptGenerator";
import {
  MethodPerformanceData,
  NativeModule,
  PerformanceMessage,
} from "./types";
import { PerformanceCodeLensProvider } from "./visualization/codeLensProvider";
import { DecorationManager } from "./visualization/decorationManager";
import { XRayWebSocketServer } from "./websocket/server";

// Import the native Rust module
let nativeModule: NativeModule;
try {
  nativeModule = require("../native/index.node");
} catch (error) {
  console.error("Failed to load native module:", error);
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Angular X-Ray");
  outputChannel.appendLine("Angular Runtime X-Ray extension activated");

  // Initialize components
  const wsServer = new XRayWebSocketServer(outputChannel);
  const decorationManager = new DecorationManager(outputChannel);
  const codeLensProvider = new PerformanceCodeLensProvider();
  const promptGenerator = new AIPromptGenerator();

  // Store performance data
  const performanceStore = new Map<string, MethodPerformanceData>();

  // Start WebSocket server
  wsServer.start();

  // Register CodeLens provider for TypeScript files
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    { language: "typescript", scheme: "file" },
    codeLensProvider,
  );

  // Handle incoming performance messages
  wsServer.onMessage((message: PerformanceMessage) => {
    handlePerformanceMessage(message, outputChannel);
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

  // Handle active editor changes
  vscode.window.onDidChangeActiveTextEditor(() => {
    decorationManager.onActiveEditorChange();
  });

  // Add disposables
  context.subscriptions.push(
    outputChannel,
    codeLensDisposable,
    analyzeCommand,
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
