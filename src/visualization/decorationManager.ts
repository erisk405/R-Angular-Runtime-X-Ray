import * as vscode from "vscode";
import { MethodPerformanceData } from "../types";

export class DecorationManager {
  private slowMethodDecorationType: vscode.TextEditorDecorationType;
  private fastMethodDecorationType: vscode.TextEditorDecorationType;
  private changeDetectionDecorationType: vscode.TextEditorDecorationType;

  private decorationQueue: Map<string, MethodPerformanceData> = new Map();
  private performanceData: Map<string, MethodPerformanceData> = new Map(); // Persistent storage
  private updateTimer: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 1000; // 1 second throttle
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.outputChannel.appendLine("[DecorationManager] Initialized");

    // Red background for slow methods (>50ms)
    this.slowMethodDecorationType =
      vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(255, 0, 0, 0.3)", // Increased opacity
        isWholeLine: false,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        after: {
          margin: "0 0 0 1em",
          color: new vscode.ThemeColor("errorForeground"), // Use theme colors
          fontWeight: "bold",
        },
      });

    // Gutter icon for fast methods (≤50ms)
    this.fastMethodDecorationType =
      vscode.window.createTextEditorDecorationType({
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        after: {
          margin: "0 0 0 1em",
          color: new vscode.ThemeColor("terminal.ansiGreen"), // Use theme colors
          fontWeight: "normal",
        },
      });

    // Change detection count decoration
    this.changeDetectionDecorationType =
      vscode.window.createTextEditorDecorationType({
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        after: {
          margin: "0 0 0 1em",
          color: new vscode.ThemeColor("terminal.ansiYellow"), // Use theme colors
          fontWeight: "bold",
        },
      });
  }

  /**
   * Normalize file path for cross-platform comparison
   */
  private normalizePathForComparison(path: string): string {
    return path.toLowerCase().replace(/\\/g, "/");
  }

  /**
   * Queue a performance update for a method
   * Updates are throttled to once per second
   */
  public queueUpdate(data: MethodPerformanceData): void {
    const key = `${data.filePath}:${data.line}`;

    // Store in persistent map
    this.performanceData.set(key, data);

    // Queue for immediate update
    this.decorationQueue.set(key, data);

    this.outputChannel.appendLine(
      `[DecorationManager] Queued: ${data.className}.${data.methodName} at ${data.filePath}:${data.line} (${data.averageDuration.toFixed(2)}ms)`,
    );

    // Start the update timer if not already running
    if (!this.updateTimer) {
      this.updateTimer = setTimeout(() => {
        this.applyQueuedDecorations();
        this.updateTimer = null;
      }, this.UPDATE_INTERVAL);
    }
  }

  /**
   * Apply all queued decorations
   */
  private applyQueuedDecorations(): void {
    const editor = vscode.window.activeTextEditor;

    this.outputChannel.appendLine(
      `[DecorationManager] Applying decorations. Active editor: ${editor?.document.uri.fsPath || "none"}`,
    );
    this.outputChannel.appendLine(
      `[DecorationManager] Queue size: ${this.decorationQueue.size}`,
    );

    if (!editor) {
      this.outputChannel.appendLine(
        "[DecorationManager] No active editor, skipping",
      );
      return;
    }

    const slowDecorations: vscode.DecorationOptions[] = [];
    const fastDecorations: vscode.DecorationOptions[] = [];
    const changeDetectionDecorations: vscode.DecorationOptions[] = [];

    const normalizedEditorPath = this.normalizePathForComparison(
      editor.document.uri.fsPath,
    );

    for (const [key, data] of this.decorationQueue) {
      // Skip if no file path or line number
      if (!data.filePath || !data.line) {
        this.outputChannel.appendLine(
          `[DecorationManager] Skipping ${key}: missing filePath or line`,
        );
        continue;
      }

      // Normalize and compare file paths
      const normalizedDataPath = this.normalizePathForComparison(data.filePath);

      if (normalizedEditorPath !== normalizedDataPath) {
        this.outputChannel.appendLine(
          `[DecorationManager] Skipping ${key}: path mismatch`,
        );
        this.outputChannel.appendLine(`  Editor: ${normalizedEditorPath}`);
        this.outputChannel.appendLine(`  Data:   ${normalizedDataPath}`);
        continue;
      }

      const line = data.line - 1; // Convert to 0-indexed

      // Validate line number
      if (line < 0 || line >= editor.document.lineCount) {
        this.outputChannel.appendLine(
          `[DecorationManager] Skipping ${key}: invalid line ${data.line} (document has ${editor.document.lineCount} lines)`,
        );
        continue;
      }

      const range = editor.document.lineAt(line).range;

      // Apply method performance decoration
      if (data.averageDuration > 50) {
        // Slow method - red background
        slowDecorations.push({
          range,
          hoverMessage: this.createHoverMessage(data),
          renderOptions: {
            after: {
              contentText: ` ⚠ ${data.averageDuration.toFixed(2)}ms (avg)`,
            },
          },
        });
      } else {
        // Fast method - green indicator
        fastDecorations.push({
          range,
          hoverMessage: this.createHoverMessage(data),
          renderOptions: {
            after: {
              contentText: ` ✓ ${data.averageDuration.toFixed(2)}ms`,
            },
          },
        });
      }

      // Apply change detection decoration if present
      if (data.changeDetectionCount !== undefined) {
        changeDetectionDecorations.push({
          range,
          hoverMessage: `Change Detection Cycles: ${data.changeDetectionCount}`,
          renderOptions: {
            after: {
              contentText: ` 🔄 CD: ${data.changeDetectionCount}`,
            },
          },
        });
      }
    }

    this.outputChannel.appendLine(
      `[DecorationManager] Applied: ${slowDecorations.length} slow, ${fastDecorations.length} fast, ${changeDetectionDecorations.length} CD`,
    );

    // Debug: Log all decoration details
    slowDecorations.forEach((dec, idx) => {
      this.outputChannel.appendLine(
        `  [Slow #${idx + 1}] Line ${dec.range.start.line + 1}: ${dec.renderOptions?.after?.contentText}`,
      );
    });
    fastDecorations.forEach((dec, idx) => {
      this.outputChannel.appendLine(
        `  [Fast #${idx + 1}] Line ${dec.range.start.line + 1}: ${dec.renderOptions?.after?.contentText}`,
      );
    });

    // Clear existing decorations and apply new ones
    editor.setDecorations(this.slowMethodDecorationType, slowDecorations);
    editor.setDecorations(this.fastMethodDecorationType, fastDecorations);
    editor.setDecorations(
      this.changeDetectionDecorationType,
      changeDetectionDecorations,
    );

    this.outputChannel.appendLine(
      `[DecorationManager] ✅ Decorations applied to editor: ${editor.document.fileName}`,
    );

    // Clear the queue
    this.decorationQueue.clear();
  }

  /**
   * Re-apply decorations for the active editor from persistent storage
   */
  private reapplyDecorationsForActiveEditor(): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return;
    }

    const normalizedEditorPath = this.normalizePathForComparison(
      editor.document.uri.fsPath,
    );

    this.outputChannel.appendLine(
      `[DecorationManager] Re-applying decorations for: ${editor.document.uri.fsPath}`,
    );

    // Queue all decorations for this file
    let count = 0;
    for (const [key, data] of this.performanceData) {
      const normalizedDataPath = this.normalizePathForComparison(
        data.filePath || "",
      );
      if (normalizedEditorPath === normalizedDataPath) {
        this.decorationQueue.set(key, data);
        count++;
      }
    }

    this.outputChannel.appendLine(
      `[DecorationManager] Queued ${count} decorations for re-application`,
    );

    // Apply immediately (bypass throttle)
    if (count > 0) {
      this.applyQueuedDecorations();
    }
  }

  /**
   * Create hover message with performance statistics
   */
  private createHoverMessage(
    data: MethodPerformanceData,
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(
      `### Performance Data: ${data.className}.${data.methodName}\n\n`,
    );
    md.appendMarkdown(
      `- **Average Duration:** ${data.averageDuration.toFixed(2)}ms\n`,
    );
    md.appendMarkdown(
      `- **Last Duration:** ${data.lastDuration.toFixed(2)}ms\n`,
    );
    md.appendMarkdown(`- **Executions:** ${data.executions.length}\n`);

    if (data.executions.length > 0) {
      const min = Math.min(...data.executions);
      const max = Math.max(...data.executions);
      md.appendMarkdown(
        `- **Min/Max:** ${min.toFixed(2)}ms / ${max.toFixed(2)}ms\n`,
      );
    }

    if (data.changeDetectionCount !== undefined) {
      md.appendMarkdown(
        `- **Change Detection Cycles:** ${data.changeDetectionCount}\n`,
      );
    }

    return md;
  }

  /**
   * Clear all decorations
   */
  public clearAll(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.slowMethodDecorationType, []);
      editor.setDecorations(this.fastMethodDecorationType, []);
      editor.setDecorations(this.changeDetectionDecorationType, []);
    }
    this.decorationQueue.clear();
  }

  /**
   * Update decorations when active editor changes
   */
  public onActiveEditorChange(): void {
    this.outputChannel.appendLine(
      "[DecorationManager] Active editor changed, re-applying decorations",
    );

    // Clear current decorations
    this.clearAll();

    // Re-apply decorations for the new editor from persistent storage
    this.reapplyDecorationsForActiveEditor();
  }

  /**
   * Dispose of all decoration types
   */
  public dispose(): void {
    this.slowMethodDecorationType.dispose();
    this.fastMethodDecorationType.dispose();
    this.changeDetectionDecorationType.dispose();

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }
}
