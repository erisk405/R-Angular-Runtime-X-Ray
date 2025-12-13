import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PerformanceSnapshot, SnapshotMetadata, NativeModule } from '../types';

/**
 * Manages snapshot storage with compression
 */
export class SnapshotStorageManager {
  private storageUri: vscode.Uri;
  private readonly MAX_SNAPSHOTS = 50;
  private readonly MAX_AGE_DAYS = 30;

  constructor(
    context: vscode.ExtensionContext,
    private nativeModule: NativeModule
  ) {
    this.storageUri = context.globalStorageUri;
    this.ensureStorageDirectory();
    this.cleanupOldSnapshots();
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    const snapshotDir = path.join(this.storageUri.fsPath, 'snapshots');
    try {
      await fs.promises.mkdir(snapshotDir, { recursive: true });
    } catch (error) {
      console.error('[SnapshotManager] Failed to create storage directory:', error);
    }
  }

  /**
   * Save a performance snapshot with compression
   */
  public async saveSnapshot(snapshot: PerformanceSnapshot): Promise<void> {
    try {
      // Convert Map to object for JSON serialization
      const snapshotData = {
        ...snapshot,
        methods: Object.fromEntries(snapshot.methods),
      };

      const snapshotJson = JSON.stringify(snapshotData);
      const compressed = this.nativeModule.compressSnapshotData(snapshotJson);

      const fileName = `snapshot_${snapshot.timestamp}_${this.sanitize(snapshot.name)}.json.gz`;
      const filePath = path.join(this.storageUri.fsPath, 'snapshots', fileName);

      await fs.promises.writeFile(filePath, compressed);

      // Cleanup old snapshots if limit exceeded
      await this.enforceSnapshotLimit();
    } catch (error) {
      throw new Error(`Failed to save snapshot: ${error}`);
    }
  }

  /**
   * Load a snapshot by ID with decompression
   */
  public async loadSnapshot(id: string): Promise<PerformanceSnapshot> {
    try {
      const files = await this.listSnapshotFiles();
      const file = files.find((f) => f.includes(id));

      if (!file) {
        throw new Error(`Snapshot ${id} not found`);
      }

      const filePath = path.join(this.storageUri.fsPath, 'snapshots', file);
      const compressed = await fs.promises.readFile(filePath);
      const json = this.nativeModule.decompressSnapshotData(compressed);
      const data = JSON.parse(json);

      // Convert back to Map
      return {
        ...data,
        methods: new Map(Object.entries(data.methods)),
      };
    } catch (error) {
      throw new Error(`Failed to load snapshot: ${error}`);
    }
  }

  /**
   * List all snapshots with metadata
   */
  public async listSnapshots(): Promise<SnapshotMetadata[]> {
    try {
      const files = await this.listSnapshotFiles();

      return files
        .map((f) => {
          const match = f.match(/snapshot_(\d+)_(.+)\.json\.gz/);
          if (match) {
            return {
              id: match[1],
              name: match[2].replace(/_/g, ' '),
              timestamp: parseInt(match[1]),
            };
          }
          return null;
        })
        .filter((x): x is SnapshotMetadata => x !== null)
        .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    } catch (error) {
      console.error('[SnapshotManager] Failed to list snapshots:', error);
      return [];
    }
  }

  /**
   * Delete a snapshot by ID
   */
  public async deleteSnapshot(id: string): Promise<void> {
    try {
      const files = await this.listSnapshotFiles();
      const file = files.find((f) => f.includes(id));

      if (!file) {
        throw new Error(`Snapshot ${id} not found`);
      }

      const filePath = path.join(this.storageUri.fsPath, 'snapshots', file);
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete snapshot: ${error}`);
    }
  }

  /**
   * Get Git branch and commit information
   */
  public async getGitInfo(): Promise<
    { branch: string; commit: string } | undefined
  > {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      if (!gitExtension) {
        return undefined;
      }

      const git = gitExtension.getAPI(1);
      const repo = git.repositories[0];

      if (!repo || !repo.state.HEAD) {
        return undefined;
      }

      return {
        branch: repo.state.HEAD.name || 'unknown',
        commit: repo.state.HEAD.commit?.substring(0, 7) || 'unknown',
      };
    } catch (error) {
      console.error('[SnapshotManager] Failed to get Git info:', error);
      return undefined;
    }
  }

  /**
   * Sanitize snapshot name for filename
   */
  private sanitize(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  /**
   * List all snapshot files
   */
  private async listSnapshotFiles(): Promise<string[]> {
    const snapshotDir = path.join(this.storageUri.fsPath, 'snapshots');
    try {
      const files = await fs.promises.readdir(snapshotDir);
      return files.filter((f) => f.endsWith('.json.gz'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Enforce maximum snapshot limit
   */
  private async enforceSnapshotLimit(): Promise<void> {
    try {
      const snapshots = await this.listSnapshots();

      if (snapshots.length > this.MAX_SNAPSHOTS) {
        const toDelete = snapshots
          .slice(this.MAX_SNAPSHOTS)
          .map((s) => s.id);

        for (const id of toDelete) {
          await this.deleteSnapshot(id);
        }

        console.log(
          `[SnapshotManager] Deleted ${toDelete.length} snapshots to enforce limit`
        );
      }
    } catch (error) {
      console.error('[SnapshotManager] Failed to enforce snapshot limit:', error);
    }
  }

  /**
   * Clean up snapshots older than MAX_AGE_DAYS
   */
  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const snapshots = await this.listSnapshots();
      const cutoffTime = Date.now() - this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

      const toDelete = snapshots
        .filter((s) => s.timestamp < cutoffTime)
        .map((s) => s.id);

      for (const id of toDelete) {
        await this.deleteSnapshot(id);
      }

      if (toDelete.length > 0) {
        console.log(
          `[SnapshotManager] Deleted ${toDelete.length} old snapshots`
        );
      }
    } catch (error) {
      console.error('[SnapshotManager] Failed to cleanup old snapshots:', error);
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalSnapshots: number;
    totalSize: number;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
  }> {
    try {
      const snapshots = await this.listSnapshots();
      const snapshotDir = path.join(this.storageUri.fsPath, 'snapshots');
      const files = await this.listSnapshotFiles();

      let totalSize = 0;
      for (const file of files) {
        const filePath = path.join(snapshotDir, file);
        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
      }

      return {
        totalSnapshots: snapshots.length,
        totalSize,
        oldestSnapshot: snapshots.length > 0
          ? snapshots[snapshots.length - 1].timestamp
          : null,
        newestSnapshot: snapshots.length > 0 ? snapshots[0].timestamp : null,
      };
    } catch (error) {
      return {
        totalSnapshots: 0,
        totalSize: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
      };
    }
  }
}
