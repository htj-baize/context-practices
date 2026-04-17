# Execution

## Initial Execution Plan

The first executable pass should stay narrow.

### Slice 1. Context Assembly

Read the live `neta-studio` world and normalize it into:

- one `StudioContinuationContext`

Primary validation:

- no hidden prompt-only state
- recent focus is explicit
- same world can be reloaded deterministically

### Slice 2. Candidate Derivation

Generate a small set of valid continuation candidates from:

- world config
- active atoms
- recent works
- latest studio conversation focus

Primary validation:

- candidates are grounded in source objects
- each candidate has a readable world reason
- invalid generic suggestions are filtered out

### Slice 3. Offer Routing

Translate valid candidates into a front-end rail with:

- top `1-3` ranked offers
- explanation
- pricing

Primary validation:

- offers feel like real next steps
- explanation is inspectable
- credits are tied to cost estimate

### Slice 4. Execution Request

Select one offer and compose:

- one structured continuation execution request

Primary validation:

- request stays tied to source objects
- request is resumable
- request is distinct from UI phrasing

### Slice 5. Writeback

Take one continuation result and write it back into:

- `works`
- or `atoms`

Primary validation:

- world state actually changes
- next continuation round can be derived from updated state

## What The First Demo Should Output

The first end-to-end practice run should produce:

- one normalized continuation context JSON
- one candidate set JSON
- one ranked offer set JSON
- one execution request JSON
- one summary Markdown artifact

## Suggested Output Paths

- `outputs/continuation-context.json`
- `outputs/continuation-candidates.json`
- `outputs/continuation-offers.json`
- `outputs/execution-request.json`
- `outputs/summary.md`

## Definition Of Done For The First Executable Pass

This case reaches its first meaningful milestone when:

1. one real `neta-studio` world can be assembled into explicit continuation context
2. the context can derive non-trivial continuation candidates
3. the candidates can be ranked into explainable offers
4. one selected offer can become a structured execution request
5. one executed result can be written back into the same world
