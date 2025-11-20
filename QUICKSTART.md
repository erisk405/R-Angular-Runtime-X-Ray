# Quick Start Guide

Get up and running with Angular Runtime X-Ray in 5 minutes.

## TL;DR

```bash
# 1. Build the extension
npm install
npm run build:rust
npm run compile
npm run package

# 2. Install in VS Code
code --install-extension angular-runtime-xray-0.1.0.vsix

# 3. Copy probe to your Angular app
cp -r probe /path/to/your/angular-app/src/

# 4. Use decorators
import { Performance } from '../probe';

@Performance()
myMethod() { /* ... */ }

# 5. Run your Angular app and open files in VS Code
ng serve
```

## Visual Guide

### What You'll See

#### 1. Fast Methods (≤50ms) - Green Indicator
```
  10 | @Performance()
  11 | calculateTotal() { ✓ 23.45ms
  12 |   return this.items.reduce((sum, item) => sum + item.price, 0);
  13 | }
```

#### 2. Slow Methods (>50ms) - Red Background
```
  20 | @Performance()
  21 | processLargeDataset() { ⚠ 127.83ms (avg)
  22 |   // Highlighted in red
  23 |   for (let i = 0; i < 1000000; i++) { ... }
  24 | }
```

#### 3. CodeLens for AI Analysis
```
⚠ Performance: 127.83ms avg - Analyze with AI
@Performance()
processLargeDataset() {
  // Click the CodeLens above to get AI optimization suggestions
}
```

#### 4. Hover Tooltips
Hover over decorated methods to see:
- **Average Duration:** 127.83ms
- **Last Duration:** 134.21ms
- **Executions:** 42
- **Min/Max:** 98.12ms / 156.47ms
- **Change Detection Cycles:** 15

## Minimal Angular Example

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { Performance } from '../probe';

@Component({
  selector: 'app-root',
  template: `
    <button (click)="onClick()">Test Performance</button>
  `
})
export class AppComponent implements OnInit {
  
  @Performance()
  ngOnInit() {
    console.log('Component initialized');
  }

  @Performance()
  onClick() {
    // Simulate slow operation
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  }
}
```

Run your app, click the button, and watch the performance data appear in VS Code!

## Expected Output in VS Code

### Output Channel (View → Output → Angular X-Ray)
```
Angular Runtime X-Ray extension activated
Angular X-Ray WebSocket server started on port 3333
Client connected to Angular X-Ray
Performance: AppComponent.ngOnInit - 2.34ms
Performance: AppComponent.onClick - 67.89ms
Located file: D:\projects\my-app\src\app\app.component.ts
Found method onClick at line 15
```

### In Your Editor
- Line 15 (onClick method) will show red background
- Inline text: `⚠ 67.89ms (avg)`
- CodeLens appears above the method
- Hover shows detailed statistics

## Common Use Cases

### 1. Monitor API Calls
```typescript
@Performance()
async fetchUserData(userId: string): Promise<User> {
  const response = await this.http.get(`/api/users/${userId}`).toPromise();
  return response.data;
}
```

### 2. Track Heavy Computations
```typescript
@Performance()
generateReport(data: any[]): Report {
  // Complex data transformation
  return this.transformData(data);
}
```

### 3. Detect Change Detection Issues
```typescript
import { Performance, TrackChangeDetection } from '../probe';

@Component({ /* ... */ })
export class MyComponent implements DoCheck {
  
  @TrackChangeDetection()
  ngDoCheck() {
    // If this fires too often, you have a CD problem
  }

  @Performance()
  updateView() {
    // This method might trigger excessive CD
  }
}
```

### 4. Optimize RxJS Streams
```typescript
@Performance()
setupDataStream() {
  return this.dataService.getData().pipe(
    map(data => this.transform(data)),
    filter(data => data.isValid),
    // Check if this pipeline is slow
  );
}
```

## Troubleshooting One-Liners

```bash
# Extension not starting?
code --list-extensions | grep angular-xray

# Rust not building?
rustc --version && cargo --version

# Native module missing?
ls native/index.node

# Port conflict?
netstat -ano | findstr :3333  # Windows
lsof -i :3333                 # Mac/Linux

# Decorators not working?
grep "experimentalDecorators" tsconfig.json

# Probe not connecting?
# Check browser console for: [Angular X-Ray] Connected to performance monitor
```

## Performance Thresholds

| Duration | Indicator | Action |
|----------|-----------|--------|
| 0-50ms | ✓ Green | Good - no action needed |
| 51-100ms | ⚠ Red | Investigate - CodeLens available |
| 100-500ms | ⚠ Red | Optimize - use AI analysis |
| >500ms | ⚠ Red | Critical - immediate optimization needed |

## Best Practices

### ✅ DO
- Decorate methods you suspect are slow
- Use `@TrackChangeDetection()` on `ngDoCheck`
- Monitor lifecycle hooks (ngOnInit, ngAfterViewInit, etc.)
- Track event handlers (click, input, etc.)
- Monitor RxJS subscription setup

### ❌ DON'T
- Decorate getters/setters (called too frequently)
- Decorate every single method (noise)
- Use in production builds (remove decorators)
- Forget to check change detection count

## Next Steps

1. **Read full documentation:** `README.md`
2. **See detailed examples:** `examples/sample-component.ts`
3. **Setup guide:** `SETUP.md`
4. **Review requirements:** Check `CHANGELOG.md` for compliance

## Quick Tips

💡 **Tip 1:** Press `Ctrl+Shift+U` to open Output panel, then select "Angular X-Ray"

💡 **Tip 2:** Use `@PerformanceWithCD()` to track both execution time and change detection in one decorator

💡 **Tip 3:** Click CodeLens to generate an AI prompt, then paste into ChatGPT/Claude for optimization advice

💡 **Tip 4:** Hover over performance indicators to see min/max/avg statistics

💡 **Tip 5:** If a method is consistently slow, the AI analysis will suggest specific optimizations based on your actual code

## Success Checklist

- [ ] Extension installed in VS Code
- [ ] Probe folder copied to Angular project
- [ ] `experimentalDecorators: true` in tsconfig.json
- [ ] At least one `@Performance()` decorator applied
- [ ] Angular app running (`ng serve`)
- [ ] VS Code Output shows "WebSocket server started"
- [ ] Browser console shows "Connected to performance monitor"
- [ ] Performance data visible in VS Code editor
- [ ] CodeLens appears above slow methods
- [ ] Hover tooltips show statistics

If all checked ✓ - you're ready to optimize! 🚀
