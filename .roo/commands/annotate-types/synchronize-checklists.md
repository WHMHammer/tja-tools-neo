# Synchronize Checklists

## Step 1: Discover source files

List all `*.ts` files under `src/ts/` recursively using `list_files` with `recursive: true`. Exclude files in subdirectories that contain only non-code assets (e.g., `sprite/*.png` are assets; `sprite/sprite.ts` is the only TS file there).

Let `FILES` be the list of relative paths (e.g., `common.ts`, `subdir/foo.ts`).

## Step 2: Ensure checklist files exist

Checklist files follow the format and naming rules described in `.roo/commands/annotate-types/checklist-structure.md`.

For every `src/ts/<path>.ts` file, verify that **both** of these exist:
- `.annotate-types-checklists/parameters/<path>.ts.md`
- `.annotate-types-checklists/return-values/<path>.ts.md`

If either file is missing, create it as an empty file (Step 3 populates it). Prefer tool calls over terminal commands.

For each parameters or return values checklist file that has no corresponding source file, delete it (the source function was removed or the file was deleted).

## Step 3: Process each source file

Synchronize all checklist files under `.annotate-types-checklists/parameters/` and `.annotate-types-checklists/return-values/` to match the source files in `src/ts/`.

Process each `<path>` below one at a time — read the source file, update both checklist files immediately (only if changes are needed), then move to the next:

{list all paths from FILES here, e.g. common.ts, analyseChart.ts, ...}

For each `<path>`:

1. Read `src/ts/<path>.ts` and extract every function declaration:
  - `export function`, `function` declarations
  - Arrow function expressions assigned to `const`/`let`/`var`
  - Nested functions inside other functions (if any)
  - **Naming rule:**  See `.roo/commands/annotate-types/checklist-structure.md` for the full naming rules.
2. Read `.annotate-types-checklists/parameters/<path>.ts.md` and `.annotate-types-checklists/return-values/<path>.ts.md`.
3. For each function in source:
  - If not in checklists: add it to both files as `[ ]` (pending).
  - Verify `[x]`/`[ ]` correctness:
    - Parameters `[x]` → every parameter has an explicit type annotation (e.g., `a: number`). If any is bare (just `notes`), mark `[ ]` in the parameters file.
    - Return value `[x]` → signature includes explicit return type (e.g., `: number`, `: void`). If omitted, mark `[ ]` in the return-values file.
  - Update any incorrect statuses.
4. For each function in checklists but absent from source: remove it from both files.
5. Write each updated checklist file only if changes are to be made.
6. Proceed to the next `<path>`.

When all files have been processed, report only: "Sync complete". Do not summarize details.
