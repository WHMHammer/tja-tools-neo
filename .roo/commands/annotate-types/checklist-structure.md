# Checklist structure

Two separate checklist directories mirror the `src/ts/` directory tree:

- `.annotate-types-checklists/parameters/<path>.ts.md` — tracks parameter annotation status
- `.annotate-types-checklists/return-values/<path>.ts.md` — tracks return value annotation status

Each file lists every exported and non-exported function in the corresponding source file, with a single checkbox per function:

`parameters/<path>.ts.md`:
```markdown
- [x] <functionName>
- [ ] <functionName>
```

`return-values/<path>.ts.md`:
```markdown
- [x] <functionName>
- [ ] <functionName>
```

- `[x]` = annotation completed
- `[ ]` = annotation pending
- A function with multiple parameters is marked `[x]` in parameters only when **all** parameters are annotated.
- Class/object methods are named with the `ClassName.methodName` prefix.
- Nested functions are named with the `outerFunctionName.innerFunctionName` prefix.
