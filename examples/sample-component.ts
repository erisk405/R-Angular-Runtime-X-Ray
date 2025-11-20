/**
 * Example Angular Component with Performance Monitoring
 *
 * This demonstrates how to use the Angular X-Ray probe decorators
 * to monitor performance in your Angular components.
 */

import { Component, OnInit, DoCheck } from '@angular/core';
import { Performance, TrackChangeDetection, PerformanceWithCD } from '../probe';

@Component({
  selector: 'app-sample',
  template: `
    <div>
      <h1>Sample Component with Performance Monitoring</h1>
      <button (click)="fastOperation()">Fast Operation</button>
      <button (click)="slowOperation()">Slow Operation</button>
      <button (click)="verySlowOperation()">Very Slow Operation</button>
      <button (click)="asyncOperation()">Async Operation</button>
    </div>
  `
})
export class SampleComponent implements OnInit, DoCheck {

  /**
   * Lifecycle hook with performance monitoring
   * This will appear in VS Code with execution time
   */
  @Performance()
  ngOnInit(): void {
    console.log('Component initialized');
    this.loadInitialData();
  }

  /**
   * Track change detection cycles
   * Apply this to ngDoCheck to monitor how often Angular checks this component
   */
  @TrackChangeDetection()
  ngDoCheck(): void {
    // Change detection tracking happens automatically
  }

  /**
   * Fast operation - will show green indicator in VS Code
   * Execution time: ~5ms
   */
  @Performance()
  fastOperation(): void {
    const result = Array.from({ length: 1000 }, (_, i) => i * 2);
    console.log('Fast operation completed', result.length);
  }

  /**
   * Slow operation - will show red background in VS Code
   * Execution time: ~60ms (exceeds 50ms threshold)
   */
  @Performance()
  slowOperation(): void {
    // Simulate slow operation
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i);
    }
    console.log('Slow operation completed', sum);
  }

  /**
   * Very slow operation - will trigger CodeLens with AI analysis
   * Execution time: ~200ms
   */
  @Performance()
  verySlowOperation(): void {
    // Inefficient nested loops - performance problem!
    const data = [];
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < 1000; j++) {
        data.push(i * j);
      }
    }
    console.log('Very slow operation completed', data.length);
  }

  /**
   * Async operation - the decorator handles promises automatically
   */
  @Performance()
  async asyncOperation(): Promise<void> {
    await this.fetchData();
    await this.processData();
    console.log('Async operation completed');
  }

  /**
   * Combined performance and change detection tracking
   * This tracks both execution time and how many CD cycles occurred
   */
  @PerformanceWithCD()
  complexOperation(): void {
    // This method tracks both performance and change detection
    const data = this.transformData();
    this.updateView(data);
  }

  // Helper methods (not decorated)

  private loadInitialData(): void {
    // Simulate initial data load
    console.log('Loading initial data...');
  }

  private async fetchData(): Promise<any> {
    // Simulate API call
    return new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 50));
  }

  private async processData(): Promise<void> {
    // Simulate data processing
    return new Promise(resolve => setTimeout(resolve, 30));
  }

  private transformData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({ id: i, value: i * 10 }));
  }

  private updateView(data: any[]): void {
    console.log('Updating view with', data.length, 'items');
  }
}

/**
 * Example Service with Performance Monitoring
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SampleService {

  @Performance()
  getData(): any[] {
    // Simulate data retrieval
    return Array.from({ length: 1000 }, (_, i) => ({ id: i }));
  }

  @Performance()
  async fetchFromApi(url: string): Promise<any> {
    // Simulate API call
    const response = await fetch(url);
    return response.json();
  }

  /**
   * This method has a performance problem - excessive DOM manipulation
   * The AI analysis will suggest using Angular's built-in rendering
   */
  @Performance()
  problematicMethod(items: any[]): void {
    // ANTI-PATTERN: Direct DOM manipulation in Angular
    const container = document.getElementById('container');
    items.forEach(item => {
      const element = document.createElement('div');
      element.textContent = item.name;
      container?.appendChild(element);
    });
    // AI will suggest: Use *ngFor instead!
  }

  /**
   * This method has performance issues with RxJS
   * AI will suggest proper operators and unsubscribe handling
   */
  @Performance()
  inefficientRxJS(): void {
    // ANTI-PATTERN: Not unsubscribing, causing memory leaks
    this.someObservable.subscribe(data => {
      // Process data without proper cleanup
      this.processLargeDataset(data);
    });
  }

  private someObservable: any;
  private processLargeDataset(data: any): void {}
}

/**
 * Real-World Example: Data Grid Component
 */
@Component({
  selector: 'app-data-grid',
  template: `
    <div class="data-grid">
      <div *ngFor="let row of rows; trackBy: trackByFn">
        {{ row.id }} - {{ row.name }}
      </div>
    </div>
  `
})
export class DataGridComponent implements OnInit, DoCheck {
  rows: any[] = [];

  @Performance()
  ngOnInit(): void {
    this.loadRows();
  }

  @TrackChangeDetection()
  ngDoCheck(): void {
    // Monitor change detection - if this fires too often,
    // it indicates a performance problem
  }

  /**
   * Loading 10,000 rows - might be slow
   * VS Code will show this in red if it exceeds 50ms
   */
  @Performance()
  loadRows(): void {
    this.rows = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Row ${i}`,
      value: Math.random() * 1000
    }));
  }

  /**
   * Proper trackBy function to optimize Angular rendering
   * This should be fast and show green indicator
   */
  @Performance()
  trackByFn(index: number, item: any): number {
    return item.id;
  }

  /**
   * Filtering operation - could be optimized
   */
  @Performance()
  filterRows(searchTerm: string): void {
    // This might be slow for large datasets
    this.rows = this.rows.filter(row =>
      row.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // AI might suggest: Use virtual scrolling or server-side filtering
  }
}
