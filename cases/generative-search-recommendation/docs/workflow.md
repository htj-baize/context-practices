# Workflow

## Step 1: Search

Use `context.search` to find relevant signals in the current context.

Expected output:

- query
- match count
- top matches

## Step 2: Recommend

Use `context.recommend` with a target that still needs input.

Expected output:

- primary next skill
- readiness decision
- structured recommendation items

## Step 3: Generate

Use `context.generate` to produce a constrained target artifact.

Expected output:

- generated artifact kind
- schema ref
- required inputs
- build summary

## Success Condition

This case is successful when one executable demo can show:

- retrieval over context
- deterministic next-step recommendation
- constrained generation through an explicit contract
