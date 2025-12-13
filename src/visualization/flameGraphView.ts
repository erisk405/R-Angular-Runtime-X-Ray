import * as vscode from 'vscode';
import { CallStackNode, FlameGraphData, NativeModule } from '../types';

/**
 * Flame graph webview provider
 */
export class FlameGraphViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'angularXray.flameGraph';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private nativeModule: NativeModule
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

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'navigateToSource':
          this.navigateToSource(message.filePath, message.line);
          break;
      }
    });
  }

  /**
   * Update flame graph with new call stack data
   */
  public async updateFlameGraph(callStacks: CallStackNode[]): Promise<void> {
    if (!this._view) {
      vscode.window.showWarningMessage(
        'Flame graph view not visible. Please open the Angular X-Ray panel.'
      );
      return;
    }

    try {
      // Use Rust module to generate flame graph
      const callStackJson = JSON.stringify(callStacks);
      const flameGraphJson = this.nativeModule.buildFlameGraphData(callStackJson);
      const flameGraphData: FlameGraphData = JSON.parse(flameGraphJson);

      // Send to webview
      this._view.webview.postMessage({
        type: 'updateFlameGraph',
        data: flameGraphData,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to generate flame graph: ${error}`
      );
    }
  }

  /**
   * Navigate to source code location
   */
  private async navigateToSource(
    filePath: string,
    line: number
  ): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);
      const position = new vscode.Position(line - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to navigate to source: ${error}`);
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
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://d3js.org; style-src 'unsafe-inline';">
      <title>Flame Graph</title>
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 10px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          font-family: var(--vscode-font-family);
          overflow: hidden;
        }
        #flame-graph {
          width: 100%;
          height: calc(100vh - 60px);
          overflow: auto;
        }
        #controls {
          padding: 10px 0;
          border-bottom: 1px solid var(--vscode-panel-border);
          margin-bottom: 10px;
        }
        .flame-rect {
          cursor: pointer;
          stroke: var(--vscode-panel-border);
          stroke-width: 1;
        }
        .flame-rect:hover {
          stroke: var(--vscode-focusBorder);
          stroke-width: 2;
        }
        .flame-text {
          pointer-events: none;
          fill: var(--vscode-editor-foreground);
          font-size: 11px;
          font-family: var(--vscode-font-family);
        }
        #tooltip {
          position: absolute;
          padding: 8px;
          background: var(--vscode-editorHoverWidget-background);
          border: 1px solid var(--vscode-editorHoverWidget-border);
          border-radius: 4px;
          display: none;
          pointer-events: none;
          z-index: 1000;
          font-size: 12px;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--vscode-descriptionForeground);
        }
        button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 2px;
          margin-right: 8px;
        }
        button:hover {
          background: var(--vscode-button-hoverBackground);
        }
      </style>
    </head>
    <body>
      <div id="controls">
        <button onclick="resetZoom()">Reset Zoom</button>
        <span id="stats"></span>
      </div>
      <div id="flame-graph">
        <div class="empty-state">
          <p>No performance data available yet.</p>
          <p>Run your Angular app with @TrackPerformance() decorators to see flame graphs.</p>
        </div>
      </div>
      <div id="tooltip"></div>

      <script>
        const vscode = acquireVsCodeApi();
        let flameData = null;
        let currentZoom = null;

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'updateFlameGraph') {
            flameData = message.data;
            renderFlameGraph(flameData);
          }
        });

        function renderFlameGraph(data) {
          const container = d3.select('#flame-graph');
          container.selectAll('*').remove();

          if (!data || !data.nodes || data.nodes.length === 0) {
            container.append('div')
              .attr('class', 'empty-state')
              .html('<p>No performance data available.</p><p>Run your Angular app with @TrackPerformance() decorators.</p>');
            return;
          }

          // Update stats
          const stats = document.getElementById('stats');
          stats.textContent = \`Total: \${data.totalDuration.toFixed(2)}ms | Nodes: \${countNodes(data.nodes)}\`;

          const width = container.node().clientWidth;
          const cellHeight = 18;
          const totalHeight = calculateHeight(data.nodes) * cellHeight;

          const svg = container.append('svg')
            .attr('width', width)
            .attr('height', totalHeight);

          const xScale = d3.scaleLinear()
            .domain([0, data.totalDuration])
            .range([0, width]);

          const colorScale = d3.scaleSequential(d3.interpolateWarm)
            .domain([0, 15]);

          renderNodes(svg, data.nodes, 0, 0, width, xScale, colorScale);
        }

        function renderNodes(svg, nodes, x, y, width, xScale, colorScale) {
          nodes.forEach(node => {
            const nodeWidth = xScale(node.value);
            const nodeX = x;

            // Draw rectangle
            const rect = svg.append('rect')
              .attr('class', 'flame-rect')
              .attr('x', nodeX)
              .attr('y', y)
              .attr('width', nodeWidth)
              .attr('height', 18)
              .attr('fill', colorScale(node.depth))
              .on('click', () => {
                if (node.filePath && node.line) {
                  vscode.postMessage({
                    type: 'navigateToSource',
                    filePath: node.filePath,
                    line: node.line
                  });
                }
              })
              .on('mouseover', (event) => showTooltip(event, node))
              .on('mouseout', hideTooltip);

            // Draw text if width allows
            if (nodeWidth > 40) {
              svg.append('text')
                .attr('class', 'flame-text')
                .attr('x', nodeX + 4)
                .attr('y', y + 13)
                .text(truncateText(node.name, nodeWidth - 8));
            }

            // Render children
            if (node.children && node.children.length > 0) {
              let childX = nodeX;
              node.children.forEach(child => {
                const childWidth = xScale(child.value);
                renderNodes(svg, [child], childX, y + 18, childWidth, xScale, colorScale);
                childX += childWidth;
              });
            }
          });
        }

        function showTooltip(event, node) {
          const tooltip = d3.select('#tooltip');
          tooltip.style('display', 'block')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px')
            .html(\`
              <strong>\${node.name}</strong><br>
              Total: \${node.value.toFixed(2)}ms<br>
              Self: \${node.selfValue.toFixed(2)}ms<br>
              Percentage: \${node.percentage.toFixed(1)}%<br>
              Depth: \${node.depth}
              \${node.filePath ? '<br><em>Click to navigate to source</em>' : ''}
            \`);
        }

        function hideTooltip() {
          d3.select('#tooltip').style('display', 'none');
        }

        function truncateText(text, maxWidth) {
          if (text.length * 6 < maxWidth) return text;
          const chars = Math.floor(maxWidth / 6) - 3;
          return text.substring(0, chars) + '...';
        }

        function calculateHeight(nodes) {
          let maxDepth = 0;
          function traverse(node, depth) {
            maxDepth = Math.max(maxDepth, depth);
            if (node.children) {
              node.children.forEach(child => traverse(child, depth + 1));
            }
          }
          nodes.forEach(node => traverse(node, 1));
          return maxDepth;
        }

        function countNodes(nodes) {
          let count = 0;
          function traverse(node) {
            count++;
            if (node.children) {
              node.children.forEach(traverse);
            }
          }
          nodes.forEach(traverse);
          return count;
        }

        function resetZoom() {
          if (flameData) {
            renderFlameGraph(flameData);
          }
        }
      </script>
    </body>
    </html>`;
  }
}
