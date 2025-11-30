/**
 * Example Angular Component with Performance Monitoring
 *
 * UPDATED: Now using @TrackPerformance() for flame graph support!
 */

import { Component, OnInit, DoCheck } from "@angular/core";
import {
  TrackPerformance,
  TrackChangeDetection,
  PerformanceWithCD,
} from "../probe";

@Component({
  selector: "app-sample",
  template: `
    <div>
      <h1>Sample Component with Flame Graph Support</h1>
      <button (click)="fastOperation()">Fast Operation</button>
      <button (click)="slowOperation()">Slow Operation</button>
      <button (click)="verySlowOperation()">Very Slow Operation</button>
      <button (click)="asyncOperation()">Async Operation</button>
      <button (click)="nestedCalls()">Nested Calls (Flame Graph Demo)</button>
    </div>
  `,
})
export class SampleComponent implements OnInit, DoCheck {
  /**
   * NEW: Using @TrackPerformance() for flame graph support
   * This will track call hierarchy
   */
  @TrackPerformance()
  ngOnInit(): void {
    console.log("Component initialized");
    this.loadInitialData();
  }

  /**
   * Track change detection cycles
   */
  @TrackChangeDetection()
  ngDoCheck(): void {
    // Change detection tracking happens automatically
  }

  /**
   * Fast operation - will show in flame graph
   */
  @TrackPerformance()
  fastOperation(): void {
    const result = Array.from({ length: 1000 }, (_, i) => i * 2);
    console.log("Fast operation completed", result.length);
  }

  /**
   * Slow operation - will show red background in VS Code
   * AND appear in flame graph with large width
   */
  @TrackPerformance()
  slowOperation(): void {
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i);
    }
    console.log("Slow operation completed", sum);
  }

  /**
   * Very slow operation - will be prominent in flame graph
   */
  @TrackPerformance()
  verySlowOperation(): void {
    const data = [];
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < 1000; j++) {
        data.push(i * j);
      }
    }
    console.log("Very slow operation completed", data.length);
  }

  /**
   * Async operation - decorator handles promises
   */
  @TrackPerformance()
  async asyncOperation(): Promise<void> {
    await this.fetchData();
    await this.processData();
    console.log("Async operation completed");
  }

  /**
   * NEW: Demonstrates nested call hierarchy in flame graph
   * This will show as a tree: nestedCalls → level1 → level2
   */
  @TrackPerformance()
  nestedCalls(): void {
    console.log("Starting nested calls...");
    this.level1();
    this.fastOperation();
  }

  @TrackPerformance()
  private level1(): void {
    // This appears as child of nestedCalls() in flame graph
    this.level2();
    const data = Array.from({ length: 5000 }, (_, i) => i * 2);
    console.log("Level 1 completed", data.length);
  }

  @TrackPerformance()
  private level2(): void {
    // This appears as child of level1() in flame graph
    // Deepest level - will show in flame graph hierarchy
    const items = Array.from({ length: 3000 }, (_, i) => i * 3);
    items.sort((a, b) => b - a);
    console.log("Level 2 completed", items.length);
  }

  /**
   * Combined performance and change detection tracking
   */
  @PerformanceWithCD()
  complexOperation(): void {
    const data = this.transformData();
    this.updateView(data);
  }

  // Helper methods (not decorated - won't appear in flame graph)

  private loadInitialData(): void {
    console.log("Loading initial data...");
  }

  private async fetchData(): Promise<any> {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ data: "test" }), 50),
    );
  }

  private async processData(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 30));
  }

  private transformData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({ id: i, value: i * 10 }));
  }

  private updateView(data: any[]): void {
    console.log("Updating view with", data.length, "items");
  }
}

/**
 * Example Service with Performance Monitoring
 */
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class SampleService {
  @TrackPerformance()
  getData(): any[] {
    return Array.from({ length: 1000 }, (_, i) => ({ id: i }));
  }

  @TrackPerformance()
  async fetchFromApi(url: string): Promise<any> {
    const response = await fetch(url);
    return response.json();
  }

  /**
   * This method has a performance problem
   * Will be very visible in flame graph due to long execution time
   */
  @TrackPerformance()
  problematicMethod(items: any[]): void {
    // ANTI-PATTERN: Direct DOM manipulation in Angular
    const container = document.getElementById("container");
    items.forEach((item) => {
      const element = document.createElement("div");
      element.textContent = item.name;
      container?.appendChild(element);
    });
    // AI will suggest: Use *ngFor instead!
  }

  /**
   * Shows parent-child relationship in flame graph
   */
  @TrackPerformance()
  inefficientRxJS(): void {
    this.someObservable.subscribe((data) => {
      this.processLargeDataset(data);
    });
  }

  @TrackPerformance()
  private processLargeDataset(data: any): void {
    // This will show as child of inefficientRxJS in flame graph
    for (let i = 0; i < 10000; i++) {
      // Expensive operation
    }
  }

  private someObservable: any;
}

/**
 * Real-World Example: Data Grid Component
 */
@Component({
  selector: "app-data-grid",
  template: `
    <div class="data-grid">
      <div *ngFor="let row of rows; trackBy: trackByFn">
        {{ row.id }} - {{ row.name }}
      </div>
    </div>
  `,
})
export class DataGridComponent implements OnInit, DoCheck {
  rows: any[] = [];

  @TrackPerformance()
  ngOnInit(): void {
    this.loadRows();
  }

  @TrackChangeDetection()
  ngDoCheck(): void {
    // Monitor change detection frequency
  }

  /**
   * Loading 10,000 rows
   * In flame graph, this will show as large block if slow
   */
  @TrackPerformance()
  loadRows(): void {
    this.rows = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Row ${i}`,
      value: Math.random() * 1000,
    }));
  }

  /**
   * Should be fast - will show as small block in flame graph
   */
  @TrackPerformance()
  trackByFn(index: number, item: any): number {
    return item.id;
  }

  /**
   * Filtering operation
   * Flame graph will show if this is called during other operations
   */
  @TrackPerformance()
  filterRows(searchTerm: string): void {
    this.rows = this.rows.filter((row) =>
      row.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
}

/**
 * FLAME GRAPH WORKFLOW EXAMPLE:
 *
 * 1. Click "Nested Calls" button
 * 2. In VS Code: Ctrl+Shift+P → "Angular X-Ray: Show Flame Graph"
 * 3. You'll see:
 *
 *    ┌──────────────────────────────────────────────┐
 *    │ nestedCalls (100ms)                          │  ← Root
 *    ├──────────────────────────────────────────────┤
 *    │  level1 (60ms)                               │  ← Child
 *    │  ├─────────────────────────────────────────┐ │
 *    │  │ level2 (30ms)                           │ │  ← Grandchild
 *    │  └─────────────────────────────────────────┘ │
 *    │  fastOperation (20ms)                        │  ← Sibling
 *    └──────────────────────────────────────────────┘
 *
 * 4. Click any block to navigate to source code
 * 5. Hover to see detailed metrics
 */
