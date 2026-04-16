# Web Shell

`context-practices` now includes a shared web validation shell under `apps/practices-web`.

## Purpose

This app is the reusable demo and verification surface for all practice cases.

It exists to keep a strict boundary:

- `cases/*`
  - case-specific scripts
  - generated artifacts
  - workflow docs
- `apps/practices-web`
  - shared presentation shell
  - mobile-first interaction patterns
  - route-level adapters that read case outputs

## Why this direction

Using a shared Next/React/Tailwind/shadcn-style app is a better long-term fit than maintaining separate static HTML demos for every case.

It gives us:

- shared navigation and layout
- reusable tabs, sheets, cards, and action bars
- a single mobile-first validation surface
- a clean place for web-only adapters

## Integration rule

When a case needs a web demo:

1. keep generation logic and output artifacts inside its own `cases/<slug>` directory
2. add a route under `apps/practices-web/src/app/<slug>`
3. read artifacts from the filesystem in the web app layer
4. never push UI-specific structures back into the case scripts unless they are genuinely consumer-facing artifacts

## Immediate next migration

The first recommended migration target is:

- `cases/neta-next-collection-recommendation/demo`

That static demo should be moved into the shared shell route once the interaction model is stable.
