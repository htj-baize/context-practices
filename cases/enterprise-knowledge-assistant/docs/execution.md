# Execution

## Runner

Run the case from the repository root:

```bash
./context-practices/cases/enterprise-knowledge-assistant/scripts/run-demo
```

## Output Artifacts

The runner materializes these outputs under `outputs/`:

- `context.read.json`
- `target.ready.read.json`
- `target.missing.read.json`
- `blocked.binding.json`
- `blocked.binding.payload.json`
- `blocked.route.json`
- `ready.binding.json`
- `ready.binding.payload.json`
- `ready.route.json`
- `ready.request.json`
- `summary.md`

## Expected Interpretation

### Blocked Path

The blocked path should show:

- missing required inputs
- a route decision that points back to context expansion or build work

### Ready Path

The ready path should show:

- no missing required inputs
- a route decision that points to `operate.prepare`
- a structured request payload that can be handed to a downstream executor
