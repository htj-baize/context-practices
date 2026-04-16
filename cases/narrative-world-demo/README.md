# Narrative World Demo

This case validates the gameplay-facing domain layer as an executable narrative-world workflow.

It focuses on the public `context-gameplay` surface.

## What This Case Proves

1. a world state can be inspected through gameplay language rather than generic context language
2. route readiness can be checked explicitly before branching
3. branching and resolution sit on top of the same underlying seam
4. domain skills can remain inspectable and deterministic

## Directory Layout

- [`docs/problem-statement.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/docs/problem-statement.md)
- [`docs/workflow.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/docs/workflow.md)
- [`docs/execution.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/docs/execution.md)
- [`scripts/run-demo`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/scripts/run-demo)
- [`outputs/.gitkeep`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/outputs/.gitkeep)
- [`outputs/summary.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/outputs/summary.md)
- [`outputs/branch-scene.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/outputs/branch-scene.json)
- [`outputs/resolve-encounter.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/narrative-world-demo/outputs/resolve-encounter.json)

## Initial Skill Chain

The first executable pass uses:

1. `game.inspect-scene`
2. `game.inspect-route`
3. `game.branch-scene`
4. `game.resolve-collectible`
5. `game.resolve-encounter`

## Current Result Goal

The case is successful when one demo shows:

- a readable scene summary
- route readiness in both ready and blocked form
- branch planning when the next scene still lacks inputs
- structured resolution for collectible and encounter interactions

## Current Result

The first executable pass is complete.

- scene:
  - title `Jiangnan Notes`
  - tone `misty`
- route:
  - ready route is `ready`
  - blocked route is missing `era`
- branch:
  - status is `planned`
  - next action is `materialize_source_state_and_rerun_context_generate`
- resolution:
  - both collectible and encounter paths produce `operation_request`
