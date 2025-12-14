import * as vscode from "vscode";
import {
  SnapshotMetadata,
  MethodPerformanceDiff,
  NativeModule,
} from "../types";
import { SnapshotStorageManager } from "../storage/snapshotManager";

/**
 * Performance comparison webview provider
 */
export class ComparisonViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "angularXray.comparison";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private nativeModule: NativeModule,
    private storageManager: SnapshotStorageManager,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  /**
   * Compare two snapshots
   */
  public async compareSnapshots(
    baselineId: string,
    currentId: string,
  ): Promise<void> {
    if (!this._view) {
      vscode.window.showWarningMessage(
        "Comparison view not visible. Please open the Angular X-Ray panel.",
      );
      return;
    }

    try {
      const baseline = await this.storageManager.loadSnapshot(baselineId);
      const current = await this.storageManager.loadSnapshot(currentId);

      // Prepare data for Rust comparison
      const baselineData: any = {};
      baseline.methods.forEach((data, key) => {
        baselineData[key] = {
          averageDuration: data.averageDuration,
          executions: data.executions,
        };
      });

      const currentData: any = {};
      current.methods.forEach((data, key) => {
        currentData[key] = {
          averageDuration: data.averageDuration,
          executions: data.executions,
        };
      });

      const baselineJson = JSON.stringify(baselineData);
      const currentJson = JSON.stringify(currentData);

      // Use Rust for fast comparison
      const comparisonJson = this.nativeModule.comparePerformanceSnapshots(
        baselineJson,
        currentJson,
        5.0, // 5% threshold
      );

      const comparison: MethodPerformanceDiff[] = JSON.parse(comparisonJson);

      // Send to webview
      this._view.webview.postMessage({
        type: "updateComparison",
        baseline: {
          name: baseline.name,
          branch: baseline.gitBranch,
          commit: baseline.gitCommit,
        },
        current: {
          name: current.name,
          branch: current.gitBranch,
          commit: current.gitCommit,
        },
        data: comparison,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to compare snapshots: ${error}`);
    }
  }

  /**
   * Get HTML content for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
      <title>Performance Comparison</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: #000000;
          color: #e4e4e7;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 13px;
        }
        h2 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.02em;
        }
        .snapshot-info {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 14px 16px;
          margin-bottom: 16px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.6;
        }
        .snapshot-info strong {
          color: #ffffff;
          font-weight: 500;
        }
        .summary {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 16px;
          margin-bottom: 16px;
          border-radius: 8px;
          font-size: 13px;
        }
        .summary strong {
          color: #ffffff;
          font-weight: 500;
          margin-right: 8px;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 12px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        th {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-weight: 500;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        tbody tr {
          transition: background 0.15s;
        }
        tbody tr:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        .regressed {
          background-color: rgba(239, 68, 68, 0.1);
          border-left: 2px solid rgba(239, 68, 68, 0.6);
        }
        .improved {
          background-color: rgba(34, 197, 94, 0.1);
          border-left: 2px solid rgba(34, 197, 94, 0.6);
        }
        .new {
          background-color: rgba(59, 130, 246, 0.1);
          border-left: 2px solid rgba(59, 130, 246, 0.6);
        }
        .removed {
          background-color: rgba(156, 163, 175, 0.1);
          border-left: 2px solid rgba(156, 163, 175, 0.6);
        }
        .filter-buttons {
          margin: 12px 0;
          display: flex;
          gap: 8px;
        }
        button {
          background: rgba(255, 255, 255, 0.05);
          color: #e4e4e7;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px 14px;
          cursor: pointer;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }
        button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        button:active {
          transform: scale(0.98);
        }
        button.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          color: #ffffff;
        }
        .positive {
          color: #22c55e;
          font-weight: 500;
        }
        .negative {
          color: #ef4444;
          font-weight: 500;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #71717a;
        }
        .empty-state p:first-child {
          font-size: 15px;
          color: #a1a1aa;
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div id="content">
        <div class="empty-state">
          <p>No comparison data available.</p>
          <p>Use the "Compare Snapshots" command to compare two performance snapshots.</p>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        let allData = [];
        let currentFilter = 'all';

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'updateComparison') {
            allData = message.data;
            renderComparison(message.baseline, message.current, message.data);
          }
        });

        function renderComparison(baseline, current, data) {
          const content = document.getElementById('content');
          const summary = calculateSummary(data);

          content.innerHTML = \`
            <h2>Performance Comparison</h2>
            <div class="snapshot-info">
              <strong>Baseline:</strong> \${baseline.name}
              \${baseline.branch ? \` (\${baseline.branch}@\${baseline.commit})\` : ''}<br>
              <strong>Current:</strong> \${current.name}
              \${current.branch ? \` (\${current.branch}@\${current.commit})\` : ''}
            </div>
            <div class="summary">
              <strong>Summary:</strong>
              Total: \${summary.total} |
              <span class="positive">Improved: \${summary.improved}</span> |
              <span class="negative">Regressed: \${summary.regressed}</span> |
              New: \${summary.new} |
              Removed: \${summary.removed} |
              Unchanged: \${summary.unchanged}
            </div>
            <div class="filter-buttons">
              <button class="\${currentFilter === 'all' ? 'active' : ''}" onclick="filterData('all')">All</button>
              <button class="\${currentFilter === 'regressed' ? 'active' : ''}" onclick="filterData('regressed')">Regressed</button>
              <button class="\${currentFilter === 'improved' ? 'active' : ''}" onclick="filterData('improved')">Improved</button>
              <button class="\${currentFilter === 'new' ? 'active' : ''}" onclick="filterData('new')">New</button>
              <button class="\${currentFilter === 'removed' ? 'active' : ''}" onclick="filterData('removed')">Removed</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th style="text-align: right;">Baseline (ms)</th>
                  <th style="text-align: right;">Current (ms)</th>
                  <th style="text-align: right;">Change (%)</th>
                  <th style="text-align: right;">Change (ms)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="table-body"></tbody>
            </table>
          \`;

          filterData(currentFilter);
        }

        function filterData(filter) {
          currentFilter = filter;
          const filtered = filter === 'all' ? allData : allData.filter(row => row.diffType === filter);

          const tbody = document.getElementById('table-body');
          if (!tbody) return;

          if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--vscode-descriptionForeground);">No methods match this filter</td></tr>';
            return;
          }

          tbody.innerHTML = filtered.map(row => \`
            <tr class="\${row.diffType}">
              <td>\${row.methodKey}</td>
              <td style="text-align: right;">\${row.baselineAvg !== null ? row.baselineAvg.toFixed(2) : '-'}</td>
              <td style="text-align: right;">\${row.currentAvg !== null ? row.currentAvg.toFixed(2) : '-'}</td>
              <td style="text-align: right; \${getChangeColor(row.percentageChange)}">\${formatPercentage(row.percentageChange)}</td>
              <td style="text-align: right; \${getChangeColor(row.absoluteChange)}">\${formatAbsolute(row.absoluteChange)}</td>
              <td>\${capitalize(row.diffType)}</td>
            </tr>
          \`).join('');

          // Update button states
          document.querySelectorAll('.filter-buttons button').forEach(btn => {
            btn.classList.remove('active');
          });
          const activeButton = Array.from(document.querySelectorAll('.filter-buttons button'))
            .find(btn => btn.textContent === capitalize(filter));
          if (activeButton) {
            activeButton.classList.add('active');
          }
        }

        function calculateSummary(data) {
          return {
            total: data.length,
            improved: data.filter(r => r.diffType === 'improved').length,
            regressed: data.filter(r => r.diffType === 'regressed').length,
            new: data.filter(r => r.diffType === 'new').length,
            removed: data.filter(r => r.diffType === 'removed').length,
            unchanged: data.filter(r => r.diffType === 'unchanged').length
          };
        }

        function formatPercentage(val) {
          if (val === null) return '-';
          return (val > 0 ? '+' : '') + val.toFixed(1) + '%';
        }

        function formatAbsolute(val) {
          if (val === null) return '-';
          return (val > 0 ? '+' : '') + val.toFixed(2);
        }

        function getChangeColor(val) {
          if (val === null || val === 0) return '';
          return val > 0 ? 'color: #f48771;' : 'color: #4ec9b0;';
        }

        function capitalize(str) {
          return str.charAt(0).toUpperCase() + str.slice(1);
        }
      </script>
    </body>
    </html>`;
  }
}
