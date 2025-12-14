import * as vscode from "vscode";
import { MethodPerformanceData } from "../types";

export class AIPromptGenerator {
  /**
   * Generate an AI analysis prompt for a method's performance
   */
  public async generatePrompt(data: MethodPerformanceData): Promise<string> {
    // Defensive check: ensure location data is available
    if (!data.filePath || !data.line) {
      throw new Error(
        `Cannot generate AI analysis: Missing location for ${data.className}.${data.methodName}. ` +
          `Try re-running your Angular app to collect fresh data.`,
      );
    }

    const codeSnippet = await this.extractCodeSnippet(data);

    const prompt = this.formatPrompt({
      methodName: `${data.className}.${data.methodName}`,
      averageDuration: data.averageDuration,
      lastDuration: data.lastDuration,
      executions: data.executions.length,
      minDuration: Math.min(...data.executions),
      maxDuration: Math.max(...data.executions),
      changeDetectionCount: data.changeDetectionCount,
      codeSnippet,
    });

    return prompt;
  }

  /**
   * Extract the code snippet for the method
   */
  private async extractCodeSnippet(
    data: MethodPerformanceData,
  ): Promise<string> {
    if (!data.filePath || !data.line) {
      return "// Code snippet not available";
    }

    try {
      const document = await vscode.workspace.openTextDocument(data.filePath);
      const startLine = Math.max(0, data.line - 3); // 3 lines before
      const endLine = Math.min(document.lineCount - 1, data.line + 15); // 15 lines after

      let snippet = "";
      for (let i = startLine; i <= endLine; i++) {
        const lineText = document.lineAt(i).text;
        const lineNumber = (i + 1).toString().padStart(4, " ");
        const marker = i === data.line - 1 ? "→" : " ";
        snippet += `${lineNumber} ${marker} ${lineText}\n`;
      }

      return snippet;
    } catch (error) {
      return `// Unable to read code snippet: ${error}`;
    }
  }

  /**
   * Format the prompt with performance metrics and code
   */
  private formatPrompt(params: {
    methodName: string;
    averageDuration: number;
    lastDuration: number;
    executions: number;
    minDuration: number;
    maxDuration: number;
    changeDetectionCount?: number;
    codeSnippet: string;
  }): string {
    const {
      methodName,
      averageDuration,
      lastDuration,
      executions,
      minDuration,
      maxDuration,
      changeDetectionCount,
      codeSnippet,
    } = params;

    return `# Angular Performance Analysis Request

## Method Information
- **Method:** ${methodName}
- **Performance Issue:** This method is executing slower than expected in an Angular application

## Runtime Metrics
- **Average Execution Time:** ${averageDuration.toFixed(2)}ms
- **Last Execution Time:** ${lastDuration.toFixed(2)}ms
- **Total Executions:** ${executions}
- **Min/Max Duration:** ${minDuration.toFixed(2)}ms / ${maxDuration.toFixed(2)}ms${
      changeDetectionCount !== undefined
        ? `\n- **Change Detection Cycles:** ${changeDetectionCount}`
        : ""
    }

## Code Snippet
\`\`\`typescript
${codeSnippet}
\`\`\`

## Analysis Request
Please analyze this Angular method and provide:

1. **Performance Issues:** Identify potential performance bottlenecks in the code
2. **Angular-Specific Concerns:** Point out any Angular anti-patterns (e.g., excessive change detection triggers, inefficient RxJS usage, improper lifecycle hooks)
3. **Optimization Recommendations:** Suggest specific code improvements with examples
4. **Best Practices:** Recommend Angular best practices that could improve performance

Focus on actionable improvements that will reduce the execution time and improve the overall application performance.
`;
  }

  /**
   * Copy the prompt to clipboard
   */
  public async copyToClipboard(prompt: string): Promise<void> {
    await vscode.env.clipboard.writeText(prompt);
  }
}
