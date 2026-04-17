# Workflow

## Practice Pipeline

The initial practice pipeline has five steps.

### 1. Assemble Studio Continuation Context

Input sources from `neta-studio`:

- `world.config`
- `atoms`
- `works`
- current `studio chat session`
- current focus such as recent tabs, recent creations, recent viewed objects

Output:

- `StudioContinuationContext`

### 2. Derive Continuation Candidates

Use the current world context to derive valid next steps such as:

- tension
- gap
- promise
- contradiction
- escalation
- resolution

Output:

- `ContinuationCandidate[]`

### 3. Filter And Score Candidates

Each candidate should be evaluated against:

- attachment to current focus
- urgency as a next step
- emotional or fantasy pull
- world fit
- estimated cost
- repetition penalty

Output:

- ranked `ContinuationCandidate[]`

### 4. Route Front-End Offers

Only the top `1-3` valid candidates should be translated into front-end offers.

Each offer should expose:

- headline
- why now
- source objects
- expected output
- intensity
- credit price

Output:

- `ContinuationOffer[]`

### 5. Compose Execution Request

When a user picks one offer, the system should produce a structured execution request rather than a loose prompt.

Output:

- `ContinuationExecutionRequest`

## Proposed Core Schemas

### `StudioContinuationContext`

```ts
type StudioContinuationContext = {
  worldId: string;
  config: WorldConfig | null;
  atoms: Atom[];
  works: Work[];
  activeConversationId: string | null;
  recentUserMessages: string[];
  recentAssistantMessages: string[];
  recentViewedAtomIds: string[];
  recentViewedWorkIds: string[];
  recentCreatedAtomIds: string[];
  recentCreatedWorkIds: string[];
};
```

### `ContinuationCandidate`

```ts
type ContinuationCandidate = {
  id: string;
  dynamicType:
    | "tension"
    | "gap"
    | "promise"
    | "contradiction"
    | "escalation"
    | "resolution";
  sourceAtomIds: string[];
  sourceWorkIds: string[];
  worldReason: string;
  brief: string;
};
```

### `ContinuationOffer`

```ts
type ContinuationOffer = {
  id: string;
  candidateId: string;
  headline: string;
  whyNow: string;
  sourceAtomIds: string[];
  sourceWorkIds: string[];
  actionType:
    | "continue"
    | "deepen"
    | "escalate"
    | "reveal"
    | "variant"
    | "bind";
  expectedOutput:
    | "new_work"
    | "work_variant"
    | "atom_variant"
    | "new_scene";
  intensity: "light" | "deep" | "intense";
  estimatedTokenCost: number;
  creditPrice: number;
};
```

### `ContinuationExecutionRequest`

```ts
type ContinuationExecutionRequest = {
  worldId: string;
  offerId: string;
  actionType: ContinuationOffer["actionType"];
  expectedOutput: ContinuationOffer["expectedOutput"];
  sourceAtomIds: string[];
  sourceWorkIds: string[];
  promptBrief: string;
  worldReason: string;
};
```

## Expected Seam With `neta-studio`

This practice should map to implementation seams like:

- `assembleStudioContinuationContext(worldId)`
- `deriveContinuationCandidates(context)`
- `rankContinuationOffers(context, candidates)`
- `composeContinuationExecutionRequest(context, offer)`
- `writeContinuationResult(worldId, result)`
