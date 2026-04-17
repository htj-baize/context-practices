# Case Roadmap

This document defines the first wave of practice cases for `context-practices`.

## Case 1: Enterprise Knowledge Assistant

### Goal

Validate that the stack can turn incomplete enterprise context into a controlled delivery workflow.

### Example Problem

A sales or solutions agent needs to prepare:

- a proposal summary
- a customer reply
- an implementation suggestion

but the available business context is incomplete.

### What This Case Should Prove

- `inspect` can summarize the current business state
- `expand` can identify missing fields before generation
- `compose` can turn a ready state into a stable downstream request

## Case 2: Generative Search Recommendation

### Goal

Validate that search, recommendation, and generation can share one common context seam.

### Example Problem

A system needs to:

- search candidate content
- recommend the next best option
- generate a personalized follow-up artifact

without treating those as three unrelated pipelines.

### What This Case Should Prove

- search consumes context rather than ad hoc prompts
- recommendation routes using explicit targets
- generation produces controlled outputs against known constraints

## Case 3: Narrative World Demo

### Goal

Validate the gameplay-facing domain layer in a realistic world-state growth scenario.

### Example Problem

An interactive narrative world needs to:

- inspect the current scene
- decide whether a route is ready
- branch into the next path
- resolve collectible or encounter states

### What This Case Should Prove

- domain skills can sit cleanly on top of generic context skills
- world-state growth can be represented as context operations rather than prompt-only improvisation
- interactive generation can remain inspectable and resumable

## Case 4: Neta Next Collection Recommendation

### Goal

Validate a real-world next-item recommendation case using the Neta recommendation feed as the upstream candidate source.

### Example Problem

A system needs to:

- browse a real recommendation feed
- select the current collection being viewed
- extract candidate next collections
- produce a structured next-collection recommendation result

### What This Case Should Prove

- the context stack can consume real external content streams
- an upstream feed can be normalized into context-shaped recommendation state
- recommendation output can be expressed as a stable structured result instead of an opaque UI-only action

## Case 5: Neta Studio Continuation Engine

### Goal

Validate a continuation-oriented context practice using a real `neta-studio` world as the runtime host.

### Example Problem

A studio world already contains:

- world config
- atoms
- works
- a recent chat session

but the system still needs to:

- determine what continuation is valid now
- route the top continuation offers
- explain the cost of that continuation
- compose an execution request that can write the result back

### What This Case Should Prove

- a live studio world can be assembled into an explicit continuation context
- continuation validity can be derived from world state rather than generic suggestion logic
- offer routing can stay inspectable and cost-aware
- continuation execution can be represented as a structured request before writeback
