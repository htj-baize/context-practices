# Workflow

## Objects

### Context

The context object represents the currently known customer state.

### Target

The target object represents the structured delivery requirements for a proposal summary.

## Pass 1: Missing Inputs

Use:

1. `context.inspect`
2. `context.expand`

Expected result:

- the system reports that required fields are still missing
- generation should not be treated as ready

## Pass 2: Ready Composition

Use:

1. `context.inspect`
2. `context.compose`

Expected result:

- the system reports a ready state
- the composed output is a stable request object rather than an ad hoc answer blob

## Concrete Validation Output

This case should eventually show:

- inspection summary
- missing required inputs list
- ready request payload
- request kind
