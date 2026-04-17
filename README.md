# Context Practices

`Context Practices` is the dedicated workspace for concrete, real-world practice cases built on top of:

- `context-weave`
- `context-skills`
- domain repositories such as `context-gameplay`

This directory exists to keep practice work separate from the product layers.

## Purpose

Use this workspace for:

- end-to-end example flows
- realistic applied demos
- scenario-specific walkthroughs
- validation of actual operator value

Do not use this workspace for:

- substrate implementation
- generic skill implementation
- domain core implementation

## Suggested Structure

- `cases/`
  - one case per real-world scenario
- `docs/`
  - cross-case notes and learnings
- `scripts/`
  - local runners and demo helpers

## Initial Case Candidates

- enterprise-knowledge-assistant
- generative-search-recommendation
- narrative-world-demo

## Practice Roadmap

The initial practice roadmap is:

1. `enterprise-knowledge-assistant`
   - validate context inspection, gap detection, and proposal/email generation readiness
2. `generative-search-recommendation`
   - validate the shared seam between search, recommendation, and constrained generation
3. `narrative-world-demo`
   - validate world-state growth, route inspection, branching, and resolution inside an interactive narrative domain
4. `neta-next-collection-recommendation`
   - validate a real external recommendation stream as the upstream source for next-collection recommendation
5. `neta-studio-continuation-engine`
   - validate a continuation context practice hosted by a real `neta-studio` world runtime

Each case should answer:

- what the real operator problem is
- what the `context` object is
- what the `target` object is
- which skills participate
- what concrete output proves the case is useful
