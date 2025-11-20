import * as vscode from 'vscode';
import { WebSocketServer, WebSocket } from 'ws';
import { PerformanceMessage } from '../types';

export class XRayWebSocketServer {
  private wss: WebSocketServer | null = null;
  private outputChannel: vscode.OutputChannel;
  private onMessageCallback?: (message: PerformanceMessage) => void;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Start the WebSocket server on port 3333
   */
  public start(): void {
    try {
      this.wss = new WebSocketServer({
        port: 3333,
        // Enable CORS to allow Angular apps from different ports
        verifyClient: () => true
      });

      this.wss.on('listening', () => {
        this.outputChannel.appendLine('Angular X-Ray WebSocket server started on port 3333');
      });

      this.wss.on('connection', (ws: WebSocket) => {
        this.outputChannel.appendLine('Client connected to Angular X-Ray');

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as PerformanceMessage;
            this.handleMessage(message);
          } catch (error) {
            this.outputChannel.appendLine(`Failed to parse message: ${error}`);
          }
        });

        ws.on('close', () => {
          this.outputChannel.appendLine('Client disconnected from Angular X-Ray');
        });

        ws.on('error', (error) => {
          this.outputChannel.appendLine(`WebSocket client error: ${error.message}`);
        });
      });

      this.wss.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          this.outputChannel.appendLine(
            'ERROR: Port 3333 is already in use. WebSocket server could not start.'
          );
          // Do not terminate the extension - as per requirement
        } else {
          this.outputChannel.appendLine(`WebSocket server error: ${error.message}`);
        }
      });

    } catch (error) {
      this.outputChannel.appendLine(`Failed to start WebSocket server: ${error}`);
    }
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    if (this.wss) {
      this.wss.close(() => {
        this.outputChannel.appendLine('Angular X-Ray WebSocket server stopped');
      });
      this.wss = null;
    }
  }

  /**
   * Set callback for when performance messages are received
   */
  public onMessage(callback: (message: PerformanceMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Handle incoming performance message
   */
  private handleMessage(message: PerformanceMessage): void {
    // Log the message
    this.outputChannel.appendLine(
      `Performance: ${message.class}.${message.method} - ${message.duration}ms` +
      (message.file ? ` (${message.file})` : '') +
      (message.changeDetectionCount ? ` [CD: ${message.changeDetectionCount}]` : '')
    );

    // Call the registered callback
    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
  }
}
