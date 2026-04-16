# Problem Statement

## Scenario

A solutions or sales operator needs to produce a proposal summary for a customer.

The customer state is partially known, but some key delivery fields are missing.

In most prompt-only systems, generation starts immediately and the output quality depends on the model guessing what is missing.

This case is designed to show a stricter flow:

1. inspect the current business context
2. compare it against an explicit target
3. detect missing required inputs
4. only compose the downstream request when the state is ready

## Business Context Example

The system may know:

- customer name
- industry
- current pain points
- preferred tone

But still miss:

- budget band
- delivery timeline
- deployment scope

## Why This Matters

This pattern is directly useful for:

- sales proposal generation
- customer reply drafting
- solution recommendation
- internal knowledge copilots that must not skip missing inputs
