# Problem Statement

## Scenario

A real recommendation product rarely starts from clean internal fixtures.

Instead, it usually starts from:

- a live recommendation stream
- a currently viewed item
- a set of candidate next items
- some rule or model that decides the next recommendation

This case is designed to make that flow explicit for Neta collections.

## The Real Product Question

Given a real Neta feed:

1. what is the current collection?
2. what are the next candidate collections?
3. which candidate should be recommended next?
4. what structured evidence supports that recommendation?

## Why This Matters

This is the most product-like recommendation case in the current practice set because it uses:

- real external upstream data
- explicit current-item vs candidate-item separation
- a stable structured recommendation output
