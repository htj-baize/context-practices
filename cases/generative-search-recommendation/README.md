# Generative Search Recommendation

This case validates that search, recommendation, and constrained generation can share the same context seam.

It is intentionally built on the current public `context-skills` surface.

## What This Case Proves

1. search can operate on a structured context instead of an ad hoc prompt
2. recommendation can route from the same context/target seam
3. generation can produce a constrained artifact from an explicit schema-facing request

## Directory Layout

- [`docs/problem-statement.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/docs/problem-statement.md)
- [`docs/workflow.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/docs/workflow.md)
- [`docs/execution.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/docs/execution.md)
- [`scripts/run-demo`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/scripts/run-demo)
- [`outputs/.gitkeep`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/outputs/.gitkeep)
- [`outputs/summary.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/outputs/summary.md)
- [`outputs/recommend.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/outputs/recommend.json)
- [`outputs/generate.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/generative-search-recommendation/outputs/generate.json)

## Initial Skill Chain

The first executable pass uses:

1. `context.search`
2. `context.recommend`
3. `context.generate`

## Current Implementation Note

The current public `context-skills` surface is still fixture-driven for search and recommendation.

So this case uses the published minimal fixtures as the seam validation substrate, while still demonstrating the intended product meaning.

## Current Result

The first executable pass is complete.

- search:
  - query `misty`
  - one structured match found from the context payload
- recommendation:
  - primary skill is `context.expand`
  - route points to `context.build` because required inputs are missing
- generation:
  - produced a constrained `standard_target`
  - schema ref `recommendation.followup.v1`
