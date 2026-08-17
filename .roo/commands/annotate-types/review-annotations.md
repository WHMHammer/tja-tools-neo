# Review Annotations

This step reviews all newly added type annotations (from unstaged git changes in the current phase) for two classes of problems:

1. **`any` or `unknown` annotations** — these must be replaced with the true type or removed.
2. **Nested type literals** — these must be extracted into named interfaces.

## Step 1: Collect unstaged changes

Run `git diff --unified=0 -- src/ts/` to get all unstaged changes in the source directory. Pipe through a filter to extract only added lines:

```
git diff --unified=0 -- src/ts/ | grep "^\+[^+]"
```

Focus on lines that introduce type annotations.

## Step 2: Scan for `any` and `unknown`

Search the unstaged diff for `: any` and `: unknown` in type positions. For each occurrence:

1. Read the source file at that location to understand the context (parameter type, return type, variable type, interface field, type alias property).
2. Attempt to **infer the true type** using the same deduction rules as `.roo/commands/annotate-types/annotate-return-types.md` (return types) or `.roo/commands/annotate-types/annotate-parameter-types.md` (parameter types), depending on what the annotation applies to:
   - **Return type** → trace return statements in the function body (see `.roo/commands/annotate-types/annotate-return-types.md` Step 3).
   - **Parameter type** → examine callers (see `.roo/commands/annotate-types/annotate-parameter-types.md` Steps 3–4).
   - **Variable/const** → trace the initialization expression.
   - **Interface field / type alias property** → trace where values are assigned to that field.
3. If you **can** deduce the true type → replace `any`/`unknown` with the correct type.
4. If you **cannot** deduce the true type:
   - For a **parameter, return type, or variable**: remove the annotation entirely (make it bare), reverting the line to its pre-annotation state.
   - For a **field of an interface or type alias**: remove the **entire interface/type alias** definition. If any code references the removed interface/type, fix those references to use the inline type or a suitable replacement.

## Step 3: Scan for nested type literals

Search the unstaged diff for type annotations that contain inline object type literals (e.g., `{ a: number; b: string }` or `{ x: { y: number } }`). For each occurrence:

1. Identify the containing scope (return type, parameter type, variable type, interface field, type alias).
2. Follow the rules in `.roo/commands/annotate-types/define-interfaces.md` to choose a name, flatten nested objects, and insert definitions.
3. Replace the inline type literal with a reference to the newly defined interface.
4. Before defining a new interface, check for existing interfaces/types in `src/ts/` that already match the shape (same rules as `.roo/commands/annotate-types/annotate-return-types.md` Step 4b and `.roo/commands/annotate-types/annotate-parameter-types.md` Step 4a).

## Step 4: Re-check checklists

After all corrections are applied:

1. Re-run `git diff --unified=0 -- src/ts/` to confirm no `any`, `unknown`, or nested type literals remain in the diff.
2. If none remain, report "Review complete: no `any`/`unknown` or nested type literals found in unstaged changes."
3. Update the parameter and return-value checklists if any annotations were added, changed, or removed during this step (`[x]` for fully annotated, `[ ]` for pending).

## Stopping conditions

This step is complete when:
- `git diff --unified=0 -- src/ts/` contains no `: any` or `: unknown` annotations, AND
- `git diff --unified=0 -- src/ts/` contains no inline object type literals (no `{ ... }` in type positions)
