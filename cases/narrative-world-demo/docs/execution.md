# Execution

## Runner

Run from the repository root:

```bash
./context-practices/cases/narrative-world-demo/scripts/run-demo
```

## Output Artifacts

The runner writes:

- `inspect-scene.json`
- `inspect-route.ready.json`
- `inspect-route.blocked.json`
- `branch-scene.json`
- `resolve-collectible.json`
- `resolve-encounter.json`
- `summary.md`

## Expected Result

The case should show:

- scene inspection in gameplay vocabulary
- route readiness becoming blocked when a target misses required inputs
- branch planning pointing to expansion when inputs are absent
- collectible and encounter resolution producing structured request-ready composition
