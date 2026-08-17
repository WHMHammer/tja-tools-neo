# Annotate Return Types

## Step 1: Select the next function

Checklist files follow the format and naming rules described in `.roo/commands/annotate-types/checklist-structure.md`.

1. Scan all files under `.annotate-types-checklists/return-values/` for a `[ ]` (pending) entry.
2. Pick the **first** unchecked function found.
3. If no `[ ]` entries remain, report "All return types annotated" and stop.

## Step 2: Read the source file and locate the function

1. Read `src/ts/<path>.ts` (the source file corresponding to the checklist).
2. Locate the function by name. Confirm it has **no explicit return-type annotation** in its signature (e.g., `function foo(...) {` not `function foo(...): SomeType {`).
3. If the function already has a return-type annotation, mark it `[x]` in the checklist and go back to Step 1.

## Step 3: Deduce the return type

Trace every execution path through the function body:

### 3a. Void functions

If **no** code path reaches a `return <value>` statement (all returns are bare `return;` or the function ends without returning), the return type is `void`.

### 3b. Single-type returns

If all `return` statements return values of the same type `T`, the return type is `T`.

Examples:
- `return 42` / `return 0` → `number`
- `return "a"` / `return `${x}`` → `string`
- `return true` / `return false` → `boolean`
- `return []` / `return [1,2,3]` → `T[]` (infer element type `T`)
- `return obj.someMethod()` → use the return type of `someMethod`
- `return new Foo()` → `Foo`

### 3c. Union types

If different code paths return values of different types, the return type is a **union** of those types (e.g., `string | null`, `number | undefined`).

### 3d. Generic/forwarded returns

If the function returns the result of calling another function `g(...)`, reuse `g`'s return type. If `g` also lacks an annotation, annotate `g` first, then come back.

## Step 4: Handle anonymous object returns

If the function returns an **anonymous object literal** (e.g., `return { x: 1, y: "a" }` or object spread `return { ...base, extra: true }`):

### 4a. Check field-type deducibility

For each field in the returned object, attempt to deduce its type from the value expression:
- Literal values (`1`, `"hello"`, `true`) → trivially deducible
- Variables/parameters → trace back to their type (if annotated) or declaration
- Function call results → use the called function's return type
- Nested anonymous objects → recurse into Step 4

If **any** field's type **cannot** be determined after reasonable effort (e.g., the value comes from an unannotated parameter or a complex dynamic expression), **skip this function** and go back to Step 1.

### 4b. Check for existing interfaces and types

1. Search `src/ts/` for existing `interface` or `type` declarations whose shape matches the deduced fields (same field names and compatible types).
2. Also check interfaces and types in other modules (including those that are not exported).
3. If a matching interface or type exists:
   - Ask the user: *"Found existing interface `IX` matching the return shape of `functionName`. Use `IX` as the return type?"*
   - If the user confirms, use that interface.
   - If the user declines, proceed to Step 4c.
4. If a **similar but not identical** interface exists (e.g., extra fields, missing fields, or different field types):
   - Ask the user: *"Interface `IX` is similar to the return shape of `functionName` but differs in [list differences]. Update `IX` to match and reuse it, or define a new interface?"*
   - Follow the user's choice.

### 4c. Define a new interface

If no suitable interface exists (or the user chooses to create a new one), follow the rules in `.roo/commands/annotate-types/define-interfaces.md` to define a new interface.

## Step 5: Annotate the return type

Add the deduced return type (or interface name) to the function signature.

Before:
```typescript
function foo(x: number) {
```

After (simple type):
```typescript
function foo(x: number): string {
```

After (interface):
```typescript
function foo(x: number): IFooResult {
```

For arrow functions:
```typescript
// Before
const foo = (x: number) => {
// After
const foo = (x: number): string => {
```

## Step 6: Update the checklist

After successfully annotating the return type:
1. Mark the function `[x]` in the corresponding `.annotate-types-checklists/return-values/<path>.ts.md` file.
2. Go back to Step 1 to process the next function.

## Step 7: Review return-type annotations (final pass)

After all return types are annotated, run the review process defined in [`.roo/commands/annotate-types/review-annotations.md`](review-annotations.md) to catch and correct:

1. **`any` or `unknown` annotations** — replace with the true type or remove.
2. **Nested type literals** — extract into named interfaces.

Follow all steps in `review-annotations.md` and apply any needed corrections to the source files and checklists.

## Stopping conditions

Stop when:
- All return-values checkboxes are `[x]`, AND
- The review pass (Step 7) reports no remaining `any`/`unknown` or nested type literals in the unstaged diff, OR
- All remaining `[ ]` functions have undeducible return types
