# Problem Statement

## Real Operator Problem

After a user creates a character, scene, or work in `neta-studio`, the system still lacks a stable way to answer:

- what should happen next
- why this next step is valid
- which continuation is most worth surfacing now
- how expensive that continuation is likely to be

Without this seam, continuation easily collapses into:

- generic prompts
- static UI suggestions
- opaque pricing
- disconnected world growth

## Why This Is A Context Practice

This case is not mainly about a page component.

It is about turning the current studio runtime into an explicit continuation context that can drive:

- offer generation
- offer ranking
- confirm/price explanation
- continuation execution
- world writeback

## Runtime Host Reality

The host system already has the right object layer:

- `world.config`
- `atoms`
- `works`
- `world visibility / owner`
- `studio chat session`

That means the case should not invent a parallel quest database first.

Instead it should derive continuation from the existing world runtime.

## Core Question

Given a real `neta-studio` world, can we build a stable continuation seam that answers:

1. what continuation is valid from current world state
2. which valid continuation should be surfaced now
3. how that continuation should be priced and explained
4. how the selected continuation should be executed and written back

## Scope Discipline

This case should validate:

- context assembly
- continuation validity
- offer routing
- execution request composition

This case should not start with:

- a persistent quest log
- a generalized task tree
- a reward system
- a payment framework
- a heavy collaboration model
