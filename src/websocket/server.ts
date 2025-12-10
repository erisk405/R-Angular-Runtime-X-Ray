import * as vscode from 'vscode';
import { WebSocket, WebSocketServer } from 'ws';
import { PerformanceMessage } from '../types';

export class XRayWebSocketServer {
  private wss: WebSocketServer | null = null;
  private outputChannel: vscode.OutputChannel;
  private onMessageCallback?: (message: PerformanceMessage) => void;
  private clients: Set<WebSocket> = new Set();
  private onClientConnectedCallback?: () => void;
  private onClientDisconnectedCallback?: () => void;
  private onErrorCallback?: (error: any) => void;

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
        this.clients.add(ws);
        this.outputChannel.appendLine('Client connected to Angular X-Ray');
        this.onClientConnectedCallback?.();

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as PerformanceMessage;
            this.handleMessage(message);
          } catch (error) {
            this.outputChannel.appendLine(`Failed to parse message: ${error}`);
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          this.outputChannel.appendLine('Client disconnected from Angular X-Ray');
          this.onClientDisconnectedCallback?.();
        });

        ws.on('error', (error) => {
          this.outputChannel.appendLine(`WebSocket client error: ${error.message}`);
        });
      });

      this.wss.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          this.outputChannel.appendLine(
            'Port 3333 is already in use. Angular X-Ray WebSocket server could not start.'
          );
        } else {
          this.outputChannel.appendLine(`WebSocket server error: ${error.message}`);
        }
        this.onErrorCallback?.(error);
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
   * Get the number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Set callback for when a client connects
   */
  public onClientConnected(callback: () => void): void {
    this.onClientConnectedCallback = callback;
  }

  /**
   * Set callback for when a client disconnects
   */
  public onClientDisconnected(callback: () => void): void {
    this.onClientDisconnectedCallback = callback;
  }

  /**
   * Set callback for when an error occurs
   */
  public onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback;
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
