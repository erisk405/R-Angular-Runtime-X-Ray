# Example Components

## TypeScript Decorator Error (ts1270)

If you see the error:
```
Decorator function return type 'void | TypedPropertyDescriptor<unknown>' 
is not assignable to type 'void | (() => void)'
```

This is a TypeScript strict mode issue that can be safely ignored. The decorators work correctly at runtime.

### Solutions:

**Option 1: Add tsconfig setting (Recommended)**

In your Angular project's `tsconfig.json`, add:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Option 2: Suppress individual errors**

Add `// @ts-ignore` above the decorator:
```typescript
// @ts-ignore
@TrackPerformance()
ngOnInit(): void {
  // ...
}
```

**Option 3: Type assertion**

Cast the decorator:
```typescript
@(TrackPerformance() as any)
ngOnInit(): void {
  // ...
}
```

## Usage

These examples demonstrate the new `@TrackPerformance()` decorator which:
- Tracks call hierarchies for flame graphs
- Records parent-child method relationships  
- Enables comparative analysis

### Basic Example

```typescript
import { TrackPerformance } from './probe';

@Component({
  selector: 'app-example'
})
export class ExampleComponent {
  @TrackPerformance()
  myMethod() {
    this.helperMethod();  // Will show as child in flame graph
  }

  @TrackPerformance()
  helperMethod() {
    // Child call
  }
}
```

### Nested Calls Example

The flame graph will show the hierarchy:
```
myMethod (100ms)
  ├─ helperMethod (60ms)
  │  └─ deepMethod (30ms)
  └─ anotherMethod (20ms)
```

## Files

- `sample-component.ts` - Complete examples with all decorator types
- `README.md` - This file (TypeScript workarounds)
