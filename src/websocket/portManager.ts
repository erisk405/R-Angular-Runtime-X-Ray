import * as vscode from 'vscode';
import * as net from 'net';

/**
 * Manages WebSocket server port configuration and availability
 */
export class PortManager {
  private currentPort: number = 3333;

  /**
   * Get configured port from VS Code settings
   */
  public getConfiguredPort(): number {
    return vscode.workspace.getConfiguration('angularXray')
      .get<number>('websocket.port', 3333);
  }

  /**
   * Check if auto-find port is enabled
   */
  public isAutoFindPortEnabled(): boolean {
    return vscode.workspace.getConfiguration('angularXray')
      .get<boolean>('websocket.autoFindPort', true);
  }

  /**
   * Check if a port is available
   */
  public async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  /**
   * Find next available port starting from the given port
   */
  public async findAvailablePort(startPort: number): Promise<number> {
    let port = startPort;
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
    }

    throw new Error(`Could not find available port between ${startPort} and ${port - 1}`);
  }

  /**
   * Get the port to use (configured or auto-found)
   */
  public async getPortToUse(): Promise<number> {
    const configuredPort = this.getConfiguredPort();

    // Check if configured port is available
    if (await this.isPortAvailable(configuredPort)) {
      this.currentPort = configuredPort;
      return configuredPort;
    }

    // If auto-find is enabled, find next available port
    if (this.isAutoFindPortEnabled()) {
      this.currentPort = await this.findAvailablePort(configuredPort + 1);
      return this.currentPort;
    }

    // Otherwise, throw error
    throw new Error(`Port ${configuredPort} is not available and auto-find is disabled`);
  }

  /**
   * Get current active port
   */
  public getCurrentPort(): number {
    return this.currentPort;
  }

  /**
   * Set current port
   */
  public setCurrentPort(port: number): void {
    this.currentPort = port;
  }
}
