# Workflow

## Step 1: Inspect Scene

Use `game.inspect-scene`.

Expected output:

- scene title
- scene tone
- current payload and required inputs summary

## Step 2: Inspect Route

Use `game.inspect-route`.

Expected output:

- route readiness
- available inputs
- missing inputs

## Step 3: Branch Scene

Use `game.branch-scene` against a target that still needs input.

Expected output:

- branch mode
- missing required inputs
- playbook status

## Step 4: Resolve Interactions

Use:

- `game.resolve-collectible`
- `game.resolve-encounter`

Expected output:

- prepared composition status
- request kind
- payload summary

## Success Condition

The case is successful when one executable run proves that:

- narrative state inspection is domain-readable
- branching and resolution are separate but coherent stages
- gameplay actions still resolve through the same structured seam
