# Neta Next Collection Recommendation

This case validates a real-world recommendation scenario using Neta's recommendation feed as the upstream source.

It is the first case in `context-practices` that is designed around a real external content stream rather than only local fixtures.

## What This Case Proves

1. an external recommendation feed can be normalized into structured recommendation state
2. the current collection and candidate collections can be separated explicitly
3. candidate collections can be enriched with detail-level `cta_info`, content tags, theme labels, and intent labels
4. the next recommendation can be expressed as a stable structured result with explanation and confidence
5. the recommendation layer can be grounded in a real feed instead of only synthetic fixtures

## Directory Layout

- [`docs/problem-statement.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/docs/problem-statement.md)
- [`docs/workflow.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/docs/workflow.md)
- [`docs/execution.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/docs/execution.md)
- [`.env.example`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/.env.example)
- [`.gitignore`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/.gitignore)
- [`scripts/run-demo`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/run-demo)
- [`scripts/neta-local`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/neta-local)
- [`scripts/setup-local-neta-from-github`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/setup-local-neta-from-github)
- [`scripts/set-last-liked-seed`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/set-last-liked-seed)
- [`inputs/.gitkeep`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/inputs/.gitkeep)
- [`outputs/.gitkeep`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/outputs/.gitkeep)
- [`outputs/summary.md`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/outputs/summary.md)
- [`outputs/recommendation.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/outputs/recommendation.json)
- [`outputs/normalized-feed.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/outputs/normalized-feed.json)
- [`outputs/current-profile.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/outputs/current-profile.json)
- [`outputs/candidate-profiles.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/outputs/candidate-profiles.json)
- [`outputs/report.html`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/outputs/report.html)

## Initial Data Source

The first pass uses the `neta-community` skill path:

- `scripts/neta request_interactive_feed`

This is intentionally feed-first:

- the upstream feed supplies candidates
- the case layer normalizes them
- the case layer produces a next-collection recommendation result

## Installation Path

This case now also provides a self-contained local bootstrap path:

- [`scripts/setup-local-neta-from-github`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/setup-local-neta-from-github)
- [`scripts/neta-local`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/neta-local)

It installs `neta-skills` from:

- [htj-baize/neta-skills](https://github.com/htj-baize/neta-skills)

into:

- `cases/neta-next-collection-recommendation/.local/vendor/neta-skills`

This is a vendored source checkout, not a guaranteed `neta-cli` binary package. That is intentional, so the case can patch the local repo directly when adding community APIs such as likes or favorites.

At the time of writing, the vendored repo exposes `skills-ref` as its discovered local CLI entrypoint, and [`scripts/neta-local`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/neta-local) forwards to that entrypoint when no `neta-cli` bin exists.

The main workspace still provides a reusable shared bootstrap path through:

- [`scripts/setup-neta.sh`](/Users/joany/Desktop/baize/one-river/scripts/setup-neta.sh)
- [`scripts/neta`](/Users/joany/Desktop/baize/one-river/scripts/neta)

This gives the case two modes:

- self-contained local install for case-specific experimentation
- shared workspace install for existing One River flows

## Current Seed Strategy

The current collection is resolved in this order:

1. `--current-collection-uuid`
2. `get_liked_list`
3. `get_favor_list`
4. [`inputs/last-liked-collection.json`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/inputs/last-liked-collection.json) if it exists
5. first valid collection in the live feed as fallback

This is intentionally pragmatic:

- the public CLI now exposes readable liked / favorited list commands
- the local seed file remains as a manual override and fallback seam

## Local Env

The case-local scripts automatically read:

- `cases/neta-next-collection-recommendation/.env.local`

Use [` .env.example `](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/.env.example) as the template. The most important value is:

- `NETA_TOKEN`

## Current Result

The executable pass is complete against a real Neta interactive feed.

- upstream source:
  - `scripts/neta request_interactive_feed --page_index 0 --page_size 10`
- result:
  - one current collection
  - five normalized candidate collections
- one structured next-collection recommendation result
- explanation and confidence output
- current / recommended cover and deep link in HTML report
- current rule:
  - `context_driven_rerank`

The rerank layer now uses:

- live feed candidate extraction from `module_list[*].json_data`
- detail fetch with `read_collection`
- `cta_info` enrichment from collection detail
- content tags and theme/intent labels
- interaction continuity as a secondary feature, not the primary rule
- single-file HTML report generation for human review

This case is now closer to a real recommendation system seam:

- feed provides recall
- case logic provides context-aware rerank
- output preserves machine-readable evidence
