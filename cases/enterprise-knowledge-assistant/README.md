# Enterprise Knowledge Assistant

This case validates a realistic enterprise workflow on top of the context stack.

The case models a common business problem:

- an operator needs to prepare a customer-facing proposal summary
- the available business context is incomplete
- the system must detect gaps before generation
- once the context is ready, the system should produce a stable downstream request

## What This Case Proves

1. `context` can represent a real business state instead of a temporary prompt
2. `target` can represent delivery requirements explicitly
3. `inspect` can summarize readiness and current gaps
4. `expand` can identify what is still missing
5. `compose` can turn a ready state into a stable execution request

## Directory Layout

- [`docs/problem-statement.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/docs/problem-statement.md)
- [`docs/workflow.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/docs/workflow.md)
- [`docs/execution.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/docs/execution.md)
- [`scripts/run-demo`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/scripts/run-demo)
- [`fixtures/customer-context.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/fixtures/customer-context.json)
- [`fixtures/proposal-target.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/fixtures/proposal-target.json)
- [`fixtures/proposal-target.missing-inputs.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/fixtures/proposal-target.missing-inputs.json)
- [`outputs/.gitkeep`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/outputs/.gitkeep)
- [`outputs/summary.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/outputs/summary.md)
- [`outputs/blocked.route.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/outputs/blocked.route.json)
- [`outputs/ready.request.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/enterprise-knowledge-assistant/outputs/ready.request.json)

## Initial Skill Chain

The first pass of this case uses the generic seam:

1. `context.inspect`
2. `context.expand`
3. `context.compose`

## Success Condition

This case is successful when we can demonstrate both:

- a blocked flow where required business inputs are still missing
- a ready flow where the same business state can be composed into a stable proposal request

## Current Result

The first executable pass is complete.

- blocked path:
  - missing `budget_band` and `delivery_timeline`
  - routed to `context.build`
- ready path:
  - routed to `operate.prepare`
  - produced a stable `operation_request`
