# 🚀 Quick Start Guide

## Installation Complete ✅

Both Rust and TypeScript have been compiled successfully. You're ready to use the extension!

---

## 5-Minute Quick Start

### 1. Copy Probe to Your Angular Project

```bash
# From your Angular project root
cp -r /path/to/angular-runtime-xray/probe ./src/probe
```

### 2. Update Your Component

```typescript
// src/app/my-component.ts
import { Component } from '@angular/core';
import { TrackPerformance } from '../probe';  // ← Import this

@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.html'
})
export class MyComponent {
  
  @TrackPerformance()  // ← Add this decorator
  myMethod() {
    // Your existing code
    this.helperMethod();
  }
  
  @TrackPerformance()  // ← Add to children too
  helperMethod() {
    // More code
  }
}
```

### 3. Run Your Angular App

```bash
ng serve
```

### 4. Open VS Code Commands

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac):

1. Type: **"Angular X-Ray: Show Flame Graph"**
2. Navigate your app (click buttons, visit pages)
3. See the flame graph update in real-time!

---

## Try Comparison Feature

### Capture Baseline
1. `Ctrl+Shift+P` → **"Angular X-Ray: Start Performance Capture"**
2. Use your app normally for 1-2 minutes
3. `Ctrl+Shift+P` → **"Angular X-Ray: Stop Performance Capture"**
4. Name it: "Baseline"

### Make Changes & Compare
1. Optimize your code
2. Capture again (name it "Optimized")
3. `Ctrl+Shift+P` → **"Angular X-Ray: Compare Performance Snapshots"**
4. Select "Baseline" vs "Optimized"
5. See what improved! 🎉

---

## View the Panels

Click the **pulse icon** (♥) in the VS Code activity bar (left sidebar) to see:
- **Flame Graph** - Interactive call hierarchy
- **Performance Comparison** - Side-by-side results

---

## Example Output

### Flame Graph
```
┌─────────────────────────────────────────┐
│ MyComponent.myMethod (125ms) 100%       │ ← Root
├─────────────────────────────────────────┤
│ MyComponent.helperMethod (75ms) 60%     │ ← Child
└─────────────────────────────────────────┘
```

### Comparison Results
```
Method                  | Baseline | Current | Change
------------------------|----------|---------|--------
MyComponent.myMethod    | 125ms    | 85ms    | -32% ✓
MyComponent.helperMethod| 75ms     | 50ms    | -33% ✓
```

---

## What's Next?

- **Read**: `COMPLETED_FEATURES.md` for full documentation
- **Explore**: More decorators in `probe/decorator.ts`
- **Share**: Package and share with your team

---

## Need Help?

Check `COMPLETED_FEATURES.md` → Troubleshooting section

**Happy optimizing! 🚀**
