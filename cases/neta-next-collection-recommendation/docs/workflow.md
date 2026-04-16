# Workflow

## Step 1: Fetch Feed

Use the Neta community feed:

- `scripts/neta request_interactive_feed --page_index 0 --page_size 10`

Expected result:

- a page of recommended collections and related feed modules

## Step 2: Resolve Current Collection

Resolve the current collection in this order:

- explicit `current_collection_uuid`
- `get_liked_list`
- `get_favor_list`
- local `last liked seed`
- feed fallback

Expected result:

- one stable current collection seed for recommendation

## Step 3: Normalize Collections

Extract feed items that can be treated as candidate collections.

Expected result:

- a normalized item list
- a selected current collection
- a list of candidate next collections

## Step 4: Enrich Collection Context

For the current collection and top candidate collections:

- fetch collection detail through `read_collection`
- extract `cta_info`
- split community tags vs content tags
- derive theme labels and intent labels
- compute semantic tokens for rerank evidence

## Step 5: Produce Recommendation Result

Generate a stable structured recommendation result:

- recommended collection id
- recommended collection title
- rank / score
- confidence
- evidence
- fallback candidates
- cover image and deep link

Default mode is rule rerank:

- concept labels
- theme labels
- intent labels
- interaction / community continuity

Optional second-stage mode can be enabled with LLM config in `.env.local`:

- rule rerank first narrows and scores candidates
- LLM rerank chooses only from the provided candidate set
- the final output records whether selection came from pure rules or `context_driven_rerank_plus_llm`

## Success Condition

This case is successful when one runner can show:

- real feed ingestion
- normalized candidate extraction
- detail-enriched rerank context
- one explicit next-collection recommendation result
