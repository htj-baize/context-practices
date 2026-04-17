# Neta Studio Continuation Engine

This case defines a new context practice built on top of the real `neta-studio` world runtime.

It treats `Studio Quest` not as a UI-only recommendation widget, but as a continuation engine derived from explicit world context.

## What This Case Proves

1. a live `neta-studio` world can be assembled into a stable continuation context
2. continuation validity can be evaluated from world state instead of ad hoc prompt intuition
3. front-end continuation offers can be derived from the same underlying context seam
4. offer pricing can be attached to continuation actions without exposing raw token logic
5. execution requests can be expressed as structured continuation operations that write back into the world

## Directory Layout

- [`docs/problem-statement.md`](./docs/problem-statement.md)
- [`docs/workflow.md`](./docs/workflow.md)
- [`docs/execution.md`](./docs/execution.md)
- [`scripts/run-demo`](./scripts/run-demo)
- [`fixtures/studio-world-snapshot.json`](./fixtures/studio-world-snapshot.json)
- [`fixtures/studio-world-snapshot-after-continuation.json`](./fixtures/studio-world-snapshot-after-continuation.json)
- [`outputs/.gitkeep`](./outputs/.gitkeep)
- [`outputs/continuation-context.json`](./outputs/continuation-context.json)
- [`outputs/continuation-candidates.json`](./outputs/continuation-candidates.json)
- [`outputs/continuation-offers.json`](./outputs/continuation-offers.json)
- [`outputs/execution-request.json`](./outputs/execution-request.json)
- [`outputs/summary.md`](./outputs/summary.md)
- [`outputs/continuation-context-v2.json`](./outputs/continuation-context-v2.json)
- [`outputs/continuation-candidates-v2.json`](./outputs/continuation-candidates-v2.json)
- [`outputs/continuation-offers-v2.json`](./outputs/continuation-offers-v2.json)
- [`outputs/execution-request-v2.json`](./outputs/execution-request-v2.json)
- [`outputs/comparison-notes.md`](./outputs/comparison-notes.md)

## Runtime Host

This case is hosted by:

- [`neta-studio`](../../../neta-studio)

Its world runtime supplies:

- `world.config`
- `atoms`
- `works`
- `studio chat session`
- current focus state such as active tabs or recently touched objects

## Initial Practice Shape

The first pass is intentionally runtime-first:

1. assemble current studio context from `neta-studio`
2. derive valid continuation candidates from world state
3. rank the top continuation offers
4. translate one selected offer into an execution request
5. write the continuation result back into the same world

## How To Run

```bash
cd context-practices/cases/neta-studio-continuation-engine
./scripts/run-demo
```

## Current Result Goal

The case is successful when one realistic `neta-studio` world can show:

- one explicit `StudioContinuationContext`
- one set of valid continuation candidates
- one ranked top-`1-3` offer rail
- one structured continuation execution request
- one clear writeback path into `works` or `atoms`

## Current Status

The case skeleton is now defined.

Current phase:

- context practice definition
- runtime seam mapping to `neta-studio`
- first multi-fixture comparison artifacts
