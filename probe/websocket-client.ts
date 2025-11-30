/**
 * WebSocket client for the Runtime Probe
 * Handles connection to the VS Code extension's WebSocket server
 */
export class XRayWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private readonly WS_URL = "ws://localhost:3333";
  private readonly RECONNECT_INTERVAL = 3000; // 3 seconds

  // Message batching for performance
  private messageQueue: any[] = [];
  private batchTimer: number | null = null;
  private readonly BATCH_INTERVAL = 100; // 100ms
  private readonly MAX_BATCH_SIZE = 50;

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
        console.log("[Angular X-Ray] Connected to performance monitor");
        this.clearReconnectTimer();
      };

      this.ws.onclose = () => {
        console.log("[Angular X-Ray] Disconnected from performance monitor");
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("[Angular X-Ray] WebSocket error:", error);
      };
    } catch (error) {
      console.error("[Angular X-Ray] Failed to create WebSocket:", error);
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
      console.log("[Angular X-Ray] Attempting to reconnect...");
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
   * Send a message to the server (with batching)
   */
  public send(message: any): void {
    this.messageQueue.push(message);

    // Flush immediately if batch is full
    if (this.messageQueue.length >= this.MAX_BATCH_SIZE) {
      this.flushQueue();
    } else if (!this.batchTimer) {
      // Schedule flush after interval
      this.batchTimer = window.setTimeout(() => {
        this.flushQueue();
      }, this.BATCH_INTERVAL);
    }
  }

  /**
   * Flush the message queue to the server
   */
  private flushQueue(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (
      this.messageQueue.length > 0 &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "batch",
            messages: this.messageQueue,
          }),
        );
        this.messageQueue = [];
      } catch (error) {
        console.error("[Angular X-Ray] Failed to send batch:", error);
      }
    }
  }

  /**
   * Disconnect and stop reconnection attempts
   */
  public disconnect(): void {
    // Flush any pending messages
    this.flushQueue();

    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create a singleton instance
export const xrayClient = new XRayWebSocketClient();
