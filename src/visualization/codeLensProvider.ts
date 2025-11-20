import * as vscode from 'vscode';
import { MethodPerformanceData } from '../types';

export class PerformanceCodeLensProvider implements vscode.CodeLensProvider {
  private performanceData: Map<string, MethodPerformanceData> = new Map();
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /**
   * Update performance data for a method
   */
  public updatePerformanceData(data: MethodPerformanceData): void {
    if (!data.filePath || !data.line) {
      return;
    }

    const key = `${data.filePath}:${data.line}`;
    this.performanceData.set(key, data);

    // Notify that CodeLens should be refreshed
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Provide CodeLens for the document
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // Find all performance data for this file
    for (const [key, data] of this.performanceData) {
      if (data.filePath !== document.uri.fsPath) {
        continue;
      }

      // Only show CodeLens for slow methods (>50ms)
      if (data.averageDuration <= 50) {
        continue;
      }

      if (!data.line || data.line < 1) {
        continue;
      }

      const line = data.line - 1; // Convert to 0-indexed

      // Make sure the line is valid
      if (line >= document.lineCount) {
        continue;
      }

      const range = new vscode.Range(line, 0, line, 0);

      const codeLens = new vscode.CodeLens(range, {
        title: `⚠ Performance: ${data.averageDuration.toFixed(2)}ms avg - Analyze with AI`,
        command: 'angularXray.analyzeWithAI',
        arguments: [data]
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }

  /**
   * Clear all performance data
   */
  public clear(): void {
    this.performanceData.clear();
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Dispose of the provider
   */
  public dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}
