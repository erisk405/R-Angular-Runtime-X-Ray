import * as vscode from 'vscode';
import { SnapshotMetadata, MethodPerformanceDiff, NativeModule } from '../types';
import { SnapshotStorageManager } from '../storage/snapshotManager';

/**
 * Performance comparison webview provider
 */
export class ComparisonViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'angularXray.comparison';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private nativeModule: NativeModule,
    private storageManager: SnapshotStorageManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
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
    currentId: string
  ): Promise<void> {
    if (!this._view) {
      vscode.window.showWarningMessage(
        'Comparison view not visible. Please open the Angular X-Ray panel.'
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
        5.0 // 5% threshold
      );

      const comparison: MethodPerformanceDiff[] = JSON.parse(comparisonJson);

      // Send to webview
      this._view.webview.postMessage({
        type: 'updateComparison',
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
      vscode.window.showErrorMessage(
        `Failed to compare snapshots: ${error}`
      );
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
          padding: 15px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          font-family: var(--vscode-font-family);
          font-size: 13px;
        }
        h2 {
          margin-top: 0;
          font-size: 16px;
        }
        .snapshot-info {
          background: var(--vscode-textBlockQuote-background);
          padding: 10px;
          margin-bottom: 15px;
          border-radius: 4px;
          border-left: 3px solid var(--vscode-textBlockQuote-border);
        }
        .summary {
          background: var(--vscode-editor-inactiveSelectionBackground);
          padding: 10px;
          margin-bottom: 15px;
          border-radius: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          padding: 6px 8px;
          text-align: left;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        th {
          background: var(--vscode-editor-selectionBackground);
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        tr:hover {
          background: var(--vscode-list-hoverBackground);
        }
        .regressed {
          background-color: rgba(255, 80, 80, 0.15);
        }
        .improved {
          background-color: rgba(80, 255, 80, 0.15);
        }
        .new {
          background-color: rgba(80, 150, 255, 0.15);
        }
        .removed {
          background-color: rgba(150, 150, 150, 0.15);
        }
        .filter-buttons {
          margin: 10px 0;
        }
        button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 4px 10px;
          margin-right: 6px;
          cursor: pointer;
          border-radius: 2px;
          font-size: 12px;
        }
        button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        button.active {
          background: var(--vscode-button-hoverBackground);
          font-weight: 600;
        }
        .positive {
          color: #4ec9b0;
        }
        .negative {
          color: #f48771;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--vscode-descriptionForeground);
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
