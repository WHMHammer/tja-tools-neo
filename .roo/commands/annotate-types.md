---
description: "Annotates TypeScript types for all functions in `src/ts/`."
---

# Inputs required

None. All information is derived from the source files in `src/ts/`.

# Workflow

## Phase 1: Synchronize Checklists (run once per conversation)

**Do NOT process files directly.** Instead, spawn a subtask using [`new_task`] in `code` mode:

```markdown
Mode: code
Message: |
  Follow all steps in `.roo/commands/annotate-types/synchronize-checklists.md` to
  synchronize all checklist files with the actual source code.

  When complete, report only: "Sync complete". Do not summarize details.
Todos: (empty — complete in one pass)
```

Do NOT repeat synchronization in the same conversation unless the user explicitly requests it.

## Phase 2: Annotate Return Types

**Do NOT process files directly.** Instead, spawn a subtask using [`new_task`] in `code` mode:

```markdown
Mode: code
Message: |
  Follow all steps in `.roo/commands/annotate-types/annotate-return-types.md` to
  annotate return types for all functions.

  When complete, report only: "All return types annotated". Do not summarize details.
Todos: (empty — complete in one pass)
```

Prompt the user for confirmation after you finish this phase before proceeding to the next phase.

## Phase 3: Annotate Parameter Types

**Do NOT process files directly.** Instead, spawn a subtask using [`new_task`] in `code` mode:

```markdown
Mode: code
Message: |
  Follow all steps in `.roo/commands/annotate-types/annotate-parameter-types.md` to
  infer and annotate function parameter types by examining callers.

  When complete, report only: "All parameter types annotated". Do not summarize details.
Todos: (empty — complete in one pass)
```
