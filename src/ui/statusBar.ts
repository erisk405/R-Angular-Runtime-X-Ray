import * as vscode from "vscode";

export enum ConnectionStatus {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
  Error = "error",
}

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentStatus: ConnectionStatus = ConnectionStatus.Disconnected;
  private clientCount: number = 0;
  private currentPort: number = 3333;
  private lastDataTime: number = 0;
  private dataCount: number = 0;

  constructor() {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100, // Priority
    );

    this.statusBarItem.command = "angularXray.showStatus";
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  updateStatus(
    status: ConnectionStatus,
    details?: {
      clientCount?: number;
      port?: number;
      error?: string;
    },
  ): void {
    this.currentStatus = status;

    if (details?.clientCount !== undefined) {
      this.clientCount = details.clientCount;
    }

    if (details?.port !== undefined) {
      this.currentPort = details.port;
    }

    this.updateStatusBar();
  }

  recordDataReceived(): void {
    this.dataCount++;
    this.lastDataTime = Date.now();
    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    const { text, tooltip, color } = this.getStatusDisplay();

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.color = color;
  }

  private getStatusDisplay(): {
    text: string;
    tooltip: string;
    color?: string;
  } {
    const baseText = "$(pulse) X-Ray";

    switch (this.currentStatus) {
      case ConnectionStatus.Connected:
        const clientText = this.clientCount > 0 ? ` (${this.clientCount})` : "";
        const dataText = this.dataCount > 0 ? ` • ${this.dataCount}` : "";

        return {
          text: `${baseText}${clientText}${dataText}`,
          tooltip: this.buildConnectedTooltip(),
          color: "#00ff00", // Green
        };

      case ConnectionStatus.Connecting:
        return {
          text: `${baseText} $(sync~spin)`,
          tooltip: "Angular X-Ray: Starting WebSocket server...",
          color: "#ffaa00", // Orange
        };

      case ConnectionStatus.Error:
        return {
          text: `${baseText} $(error)`,
          tooltip: "Angular X-Ray: Connection error - Click for details",
          color: "#ff0000", // Red
        };

      case ConnectionStatus.Disconnected:
      default:
        return {
          text: `${baseText} $(circle-slash)`,
          tooltip: "Angular X-Ray: Not connected - Click to start monitoring",
          color: "#888888", // Gray
        };
    }
  }

  private buildConnectedTooltip(): string {
    const lines = [
      "🚀 Angular X-Ray: Active",
      `📡 WebSocket Server: Running on port ${this.currentPort}`,
      `👥 Connected Clients: ${this.clientCount}`,
      `📊 Data Points Received: ${this.dataCount}`,
    ];

    if (this.lastDataTime > 0) {
      const timeSince = Math.round((Date.now() - this.lastDataTime) / 1000);
      lines.push(`⏱️ Last Data: ${timeSince}s ago`);
    }

    lines.push("", "💡 Click for more options");

    return lines.join("\n");
  }

  async showStatusDetails(): Promise<void> {
    const options: vscode.QuickPickItem[] = [
      {
        label: "$(info) Show Connection Status",
        description: this.getStatusDescription(),
        detail: "View detailed connection information",
      },
      {
        label: "$(settings-gear) Open Settings",
        description: "Configure Angular X-Ray",
        detail: "Adjust performance thresholds and other settings",
      },
      {
        label: "$(output) Show Output Log",
        description: "View extension logs",
        detail: "Debug connection and performance issues",
      },
    ];

    // Add conditional options based on status
    if (this.currentStatus === ConnectionStatus.Disconnected) {
      options.unshift({
        label: "$(play) Start Monitoring",
        description: "Start the WebSocket server",
        detail: "Begin monitoring Angular application performance",
      });
    }

    if (
      this.currentStatus === ConnectionStatus.Connected &&
      this.clientCount === 0
    ) {
      options.push({
        label: "$(question) Setup Help",
        description: "How to connect your Angular app",
        detail: "Get help setting up the performance probe",
      });
    }

    if (this.dataCount > 0) {
      options.push({
        label: "$(graph) Show Performance Data",
        description: `View ${this.dataCount} performance measurements`,
        detail: "Open flame graph and performance visualizations",
      });
    }

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Angular X-Ray Status & Actions",
      ignoreFocusOut: true,
    });

    if (selected) {
      await this.handleStatusAction(selected.label);
    }
  }

  private async handleStatusAction(action: string): Promise<void> {
    if (action.includes("Start Monitoring")) {
      await vscode.commands.executeCommand("angularXray.startCapture");
    } else if (action.includes("Show Connection Status")) {
      await this.showConnectionDetails();
    } else if (action.includes("Open Settings")) {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "angularXray",
      );
    } else if (action.includes("Show Output Log")) {
      await vscode.commands.executeCommand(
        "workbench.action.output.toggleOutput",
        "Angular X-Ray",
      );
    } else if (action.includes("Setup Help")) {
      await vscode.commands.executeCommand("angularXray.setupProbe");
    } else if (action.includes("Show Performance Data")) {
      await vscode.commands.executeCommand("angularXray.showFlameGraph");
    }
  }

  private async showConnectionDetails(): Promise<void> {
    const details = [
      "# Angular X-Ray Connection Status",
      "",
      `**Status:** ${this.getStatusDescription()}`,
      `**WebSocket Server:** ${this.currentStatus === ConnectionStatus.Connected ? `Running on port ${this.currentPort}` : "Not running"}`,
      `**Connected Clients:** ${this.clientCount}`,
      `**Data Points Received:** ${this.dataCount}`,
      "",
    ];

    if (this.lastDataTime > 0) {
      const lastDataDate = new Date(this.lastDataTime);
      details.push(`**Last Data Received:** ${lastDataDate.toLocaleString()}`);
    }

    if (
      this.currentStatus === ConnectionStatus.Connected &&
      this.clientCount === 0
    ) {
      details.push(
        "",
        "## 🔧 No clients connected",
        "",
        "To connect your Angular application:",
        "1. Run `Angular X-Ray: Setup Performance Monitoring`",
        "2. Add `@Performance()` decorators to your methods",
        "3. Start your Angular app with `ng serve`",
        "4. The probe will automatically connect",
      );
    }

    if (this.currentStatus === ConnectionStatus.Error) {
      details.push(
        "",
        "## ❌ Connection Error",
        "",
        "Common solutions:",
        "- Check if port 3333 is available",
        "- Restart VS Code",
        "- Check the Output panel for detailed error messages",
      );
    }

    const doc = await vscode.workspace.openTextDocument({
      content: details.join("\n"),
      language: "markdown",
    });

    await vscode.window.showTextDocument(doc, { preview: true });
  }

  private getStatusDescription(): string {
    switch (this.currentStatus) {
      case ConnectionStatus.Connected:
        return `✅ Connected (${this.clientCount} clients)`;
      case ConnectionStatus.Connecting:
        return "🔄 Starting up...";
      case ConnectionStatus.Error:
        return "❌ Connection error";
      case ConnectionStatus.Disconnected:
      default:
        return "⭕ Not connected";
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
