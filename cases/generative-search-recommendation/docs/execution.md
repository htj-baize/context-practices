# Execution

## Runner

Run from the repository root:

```bash
./context-practices/cases/generative-search-recommendation/scripts/run-demo
```

## Output Artifacts

The runner writes:

- `search.json`
- `recommend.json`
- `generate.json`
- `summary.md`

## Expected Result

The case should demonstrate:

- `context.search` returns matches from the current context
- `context.recommend` routes toward `context.expand` when the target still lacks inputs
- `context.generate` builds a constrained target artifact rather than free-form content
