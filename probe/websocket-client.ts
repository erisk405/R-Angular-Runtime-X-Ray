/**
 * WebSocket client for the Runtime Probe
 * Handles connection to the VS Code extension's WebSocket server
 */
export class XRayWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private readonly WS_URL = 'ws://localhost:3333';
  private readonly RECONNECT_INTERVAL = 3000; // 3 seconds

  constructor() {
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private connect(): void {
    try {
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('[Angular X-Ray] Connected to performance monitor');
        this.clearReconnectTimer();
      };

      this.ws.onclose = () => {
        console.log('[Angular X-Ray] Disconnected from performance monitor');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Angular X-Ray] WebSocket error:', error);
      };

    } catch (error) {
      console.error('[Angular X-Ray] Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectTimer = window.setTimeout(() => {
      console.log('[Angular X-Ray] Attempting to reconnect...');
      this.reconnectTimer = null;
      this.connect();
    }, this.RECONNECT_INTERVAL);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Send a message to the server
   */
  public send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[Angular X-Ray] Failed to send message:', error);
      }
    }
  }

  /**
   * Disconnect and stop reconnection attempts
   */
  public disconnect(): void {
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create a singleton instance
export const xrayClient = new XRayWebSocketClient();
