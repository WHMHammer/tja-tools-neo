# Annotate Parameter Types

This phase infers parameter types by examining callers. Unlike return types (deduced from the function body), parameter types are deduced from the values passed at call sites.

Do NOT annotate anything as `any` or `unknown`. If a parameter type cannot be confidently determined, leave it unannotated.

## Step 1: Select the next function

Checklist files follow the format and naming rules described in `.roo/commands/annotate-types/checklist-structure.md`.

1. Scan all files under `.annotate-types-checklists/parameters/` for a `[ ]` (pending) entry.
2. Pick the **first** unchecked function found.
3. If no `[ ]` entries remain, report "All parameter types annotated" and stop.

## Step 2: Read the source file and locate the function

1. Read `src/ts/<path>.ts` (the source file corresponding to the checklist).
2. Locate the function by name. Identify which parameters are **already annotated** (have an explicit type like `a: number`) and which are **bare** (no type annotation, e.g., just `a`).
3. If all parameters are already annotated, mark the function `[x]` in the checklist and go back to Step 1.

## Step 3: Find all callers

1. Search `src/ts/` for all call sites of the function. A call site is any expression that invokes the function:
   - `funcName(args)`
   - `obj.funcName(args)` (for methods)
   - `funcName.call(...)`, `funcName.apply(...)`
2. If the function has **zero callers** (unused or only referenced without invocation):
   - Ask the user: *"Function `functionName` has no callers. Would you like to comment it out?"*
   - If the user confirms, comment out the function and remove it from both parameter and return value checklists. Then go back to Step 1.
   - If the user declines, **skip this function** and go back to Step 1. You cannot infer parameter types without callers.
3. Collect every call site. For each call site, list the argument expressions passed to each parameter position.

## Step 4: Infer types from callers

For each **unannotated** parameter, inspect the argument values passed at every call site. Categorize each argument expression:

| Argument expression | Inferred type |
|---|---|
| `42`, `0`, `-1`, `3.14` | `number` |
| `"hello"`, `` `template` ``, `'single'` | `string` |
| `true`, `false` | `boolean` |
| `null` | `null` (but check: if other callers pass non-null, the type is likely `T \| null`) |
| `undefined` | `undefined` (same caution as null) |
| `[]`, `[1, 2, 3]` | `T[]` (infer element type `T` from array contents) |
| `new Foo()` | `Foo` |
| A variable `v` | Trace `v`'s declaration to find its type (if annotated) or its initialization value |
| A function call `g(...)` | Use `g`'s return type. If `g` also lacks annotation, annotate `g`'s return type first (see `.roo/commands/annotate-types/annotate-return-types.md`), then come back. |
| Arrow/function expression `(x) => ...` | Function type — infer parameter and return types from the expression |

### 4a. Object literal arguments

If callers pass anonymous object literals to this parameter:

1. Collect the set of field names and their value types across all call sites for that parameter position.
2. Search `src/ts/` for existing `interface` or `type` declarations whose shape matches the deduced fields (same field names and compatible types):
   - If an **exact match** exists → reuse that interface/type.
   - If a **similar but not identical** interface/type exists → ask the user: *"Interface `IX` is similar to the shape passed to parameter `p` of `functionName` but differs in [list differences]. Update `IX` to match and reuse it, or define a new interface?"* Follow the user's choice.
   - If **no suitable interface/type** exists → define a new one (see Step 4a.1 below).

If **some callers** pass values returned by other functions (not object literals), annotate the return value of those functions first (see `.roo/commands/annotate-types/annotate-return-types.md`), then come back to this parameter.

#### 4a.1 Defining a new interface for object literal arguments

If no suitable interface exists (or the user chooses to create a new one), follow the rules in `.roo/commands/annotate-types/define-interfaces.md` to define a new interface.

### 4b. Combine evidence across callers

- If **all callers** pass the same type `T` for a parameter, the parameter type is `T`.
- If different callers pass different types, the parameter type is a **union** of those types (e.g., `string | number`, `Foo | null`).

### 4c. Confidence threshold

Annotate only when you are **confident** about the type:

- **Annotate** if all callers consistently pass the same type, or if the union is clear and well-defined.
- **Leave unannotated** if:
  - The function has no callers.
  - Callers pass values whose types cannot be reliably traced.
  - Different callers pass conflicting types that suggest the function is polymorphic in non-obvious ways.
  - The argument is always `null` or `undefined` and you cannot determine the intended non-null type.

## Step 5: Investigate inconsistencies (on-demand only)

Do NOT proactively audit every existing annotation. Only investigate when you notice an inconsistency or conflict during the annotation process.

### 5a. When to investigate

- An already-annotated parameter's type conflicts with the evidence from callers (e.g., annotated as `number` but callers pass `string`).
- The return type annotation seems inconsistent with how the function is actually used.
- A local variable type annotation contradicts the value assigned to it.

### 5b. Resolution

If an existing annotation is **clearly wrong** and you know the correct type → correct the annotation. If it is **clearly wrong** but you don't know the correct type → **remove** the wrong annotation (make the parameter bare or remove the return type) and leave it unannotated. Update the corresponding checklist(s) accordingly: if a previously `[x]` function now has a bare parameter, mark it `[ ]`.

If correcting or removing an annotation would affect other functions that depend on it (e.g., callers that use the return type), fix those as well.

## Step 6: Annotate the parameter types

For each **unannotated** parameter where you are confident about the type:

```typescript
// Before
function foo(a, b: number) {

// After
function foo(a: string, b: number) {
```

For arrow functions:

```typescript
// Before
const foo = (a, b: number) => {
// After
const foo = (a: string, b: number) => {
```

Do NOT annotate parameters where the type is unclear. Partial annotation (some parameters annotated, some bare) is acceptable. The function stays `[ ]` in the checklist until all parameters are annotated.

## Step 7: Verify usage consistency

After annotating a parameter, check how that parameter is **used inside the function body**:

1. Read the function body and examine all uses of the newly-annotated parameter.
2. Confirm that the operations performed on the parameter are valid for the type you assigned:
   - If you annotated as `string`, check that the body calls `.length`, `.slice()`, string concatenation, etc. — these confirm `string`.
   - If you annotated as `number`, check for arithmetic operations, `.toFixed()`, comparisons — these confirm `number`.
   - If you annotated as `T[]`, check for `.length`, indexing, `.map()`, `.forEach()` — these confirm array.
3. If the body uses the parameter in a way that **contradicts** your annotation:
   - Re-examine the type deduction. The body usage may reveal the true type.
   - If the contradiction is unresolved, leave the parameter unannotated.
4. If this check reveals that another parameter or local variable has a wrong annotation, apply Step 5b.

## Step 8: Update the checklist

After annotating parameters:

1. If **all** parameters of the function are now annotated, mark it `[x]` in `.annotate-types-checklists/parameters/<path>.ts.md`.
2. If some parameters remain bare, leave it `[ ]`.
3. If you corrected or removed any existing annotations (Step 5), update the corresponding return-values checklist if the return type changed.
4. Go back to Step 1 to process the next function.

## Step 9: Review parameter-type annotations (final pass)

After all parameter types are annotated, run the review process defined in [`.roo/commands/annotate-types/review-annotations.md`](review-annotations.md) to catch and correct:

1. **`any` or `unknown` annotations** — replace with the true type or remove.
2. **Nested type literals** — extract into named interfaces.

Follow all steps in `review-annotations.md` and apply any needed corrections to the source files and checklists.

## Stopping conditions

Stop when:
- All parameters checkboxes are `[x]`, AND
- The review pass (Step 9) reports no remaining `any`/`unknown` or nested type literals in the unstaged diff, OR
- All remaining `[ ]` functions have zero callers, OR
- All remaining `[ ]` functions have parameters whose types cannot be confidently inferred from callers
