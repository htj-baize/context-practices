# Problem Statement

## Scenario

A real system often needs to do three things in one flow:

1. search candidate signals from current state
2. recommend the next best action
3. generate a constrained artifact for the next step

In many production systems, those three capabilities are implemented as separate pipelines with different assumptions and incompatible inputs.

This case is designed to show the opposite:

- search reads the same context seam
- recommendation reasons over the same context/target seam
- generation still happens against an explicit target- or schema-facing contract

## Why This Matters

This pattern is directly relevant to:

- content recommendation systems
- education flows
- decision support systems
- personalized follow-up pipelines
