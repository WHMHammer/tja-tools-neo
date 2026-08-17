# Define Interfaces

Use these rules whenever you need to define a new interface for an anonymous object — whether it's a return type, a parameter type, or a local variable type.

## 1. Choose a descriptive name

Name the interface based on the object's purpose (e.g., `DrawChartOptions`, `ParseResult`, `MeasureData`).

## 2. Flatten nested objects and order by DFS

If any field's value is itself an anonymous object, define a separate interface for that nested object. Do NOT inline nested object types.

Insert **all** new interface definitions **immediately before** the function in the source file. Order them top-down: define the top-level interface first, then the interfaces it references in DFS order.

❌ Wrong (inlined nesting):
```typescript
interface I {
  a: {
    a1: {
      a1A: number;
    };
  };
  b: {
    b1: {
      b1A: string;
    };
  };
}
```

✅ Correct (flattened + DFS order):
```typescript
// Top-level interface first
interface I {
  a: A;
  b: B;
}

// Then the interfaces it references, in DFS order
interface A {
  a1: A1;
}

interface A1 {
  a1A: number;
}

interface B {
  b1: B1;
}

interface B1 {
  b1A: string;
}
```
