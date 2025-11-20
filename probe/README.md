# Angular X-Ray Runtime Probe

This is the browser-side component of Angular Runtime X-Ray. Include this in your Angular application to enable performance monitoring.

## Installation

Copy this entire `probe` folder to your Angular project (e.g., `src/probe/`).

## Usage

### Basic Performance Monitoring

```typescript
import { Performance } from './probe';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent {
  @Performance()
  slowMethod() {
    // This method's execution time will be tracked
    for (let i = 0; i < 1000000; i++) {
      // Heavy computation
    }
  }

  @Performance()
  async asyncMethod() {
    // Async methods are also supported
    await this.dataService.fetchData();
  }
}
```

### With File Path (Optional)

Providing the file path helps the extension locate your code faster:

```typescript
@Performance({ file: __filename })
myMethod() {
  // method body
}
```

### Track Change Detection

Monitor how often Angular runs change detection for your component:

```typescript
import { Performance, TrackChangeDetection } from './probe';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent implements DoCheck {
  @TrackChangeDetection()
  ngDoCheck() {
    // This will track change detection cycles
  }

  @Performance()
  ngOnInit() {
    // Regular performance monitoring
  }
}
```

### Combined Performance and Change Detection

```typescript
import { PerformanceWithCD } from './probe';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent {
  @PerformanceWithCD()
  complexMethod() {
    // Tracks both execution time and change detection count
  }
}
```

## How It Works

1. The decorators wrap your methods with timing logic
2. Performance data is sent via WebSocket to `ws://localhost:3333`
3. The VS Code extension receives the data and displays it in your editor
4. If the connection drops, the probe automatically reconnects every 3 seconds

## Decorators Reference

### `@Performance(options?)`
Tracks method execution time.

**Options:**
- `file?: string` - Optional file path for faster file location

**Features:**
- Works with sync and async methods
- Records start/end time
- Sends duration to VS Code extension

### `@TrackChangeDetection()`
Tracks Angular change detection cycles.

**Usage:**
- Apply to `ngDoCheck()` lifecycle hook
- Reports every 10 cycles to avoid spam

### `@PerformanceWithCD(options?)`
Combined performance and change detection tracking.

**Options:**
- Same as `@Performance()`

**Features:**
- All features of `@Performance()`
- Includes change detection count in report

## Requirements

- Modern browser with WebSocket support
- Angular application running in development mode
- Angular X-Ray VS Code extension installed and active

## TypeScript Configuration

Ensure your `tsconfig.json` has decorator support enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Connection Status

Check the browser console for connection messages:
- `[Angular X-Ray] Connected to performance monitor` - Successfully connected
- `[Angular X-Ray] Disconnected from performance monitor` - Connection lost
- `[Angular X-Ray] Attempting to reconnect...` - Auto-reconnect in progress

## Troubleshooting

### Decorators Not Working
- Ensure `experimentalDecorators: true` in `tsconfig.json`
- Verify TypeScript version is 4.0 or higher

### WebSocket Connection Failed
- Check that the Angular X-Ray extension is active in VS Code
- Verify port 3333 is not blocked by firewall
- Ensure you're running on localhost (CORS restrictions apply to remote hosts)

### No Data in VS Code
- Check the Angular X-Ray output channel in VS Code for errors
- Verify the decorated methods are actually being called
- Check browser console for connection status

## Performance Impact

The probe has minimal performance impact:
- ~0.1ms overhead per decorated method call
- WebSocket messages are small (< 1KB)
- Automatic throttling prevents message spam
- No impact when VS Code extension is not running (messages are queued and dropped)
