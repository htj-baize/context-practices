# Neta Studio Live World Playground

This case is the live-input counterpart to `neta-studio-continuation-engine`.

It does not focus on controlled fixture comparison.

It focuses on feeding public `neta-studio` worlds into the continuation engine and inspecting what the engine derives from real upstream world state.

## What This Case Proves

1. public `neta-studio` world snapshots can be adapted into continuation context without fixture-only assumptions
2. chat-session data from public worlds can flow into session-aware continuation derivation
3. the continuation engine can be inspected against real upstream data before host-side full integration

## Contrast With The Engine Case

- `neta-studio-continuation-engine`
  - controlled fixtures
  - engine validation
  - comparison-oriented

- `neta-studio-live-world-playground`
  - public world input
  - live inspection
  - upstream validation
