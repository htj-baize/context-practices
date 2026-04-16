# Execution

## Prerequisite

Create a workspace-level env file if you want the vendored CLI to authenticate automatically:

```bash
cp ./context-practices/.env.example \
  ./context-practices/.env.local
```

Then fill in at least:

- `NETA_TOKEN`

Optional but recommended:

- `NETA_API_BASE_URL`
- `NETA_AUTH_API_BASE_URL`
- `NETA_REPO_URL`
- `NETA_REPO_REF`

This case can use the shared workspace bootstrap path:

- [`scripts/setup-neta.sh`](../../../scripts/setup-neta.sh)
- [`scripts/neta`](../../../scripts/neta)

The expected setup flow is:

```bash
./scripts/neta --version
```

This command bootstraps local Node and the `@talesofai/neta-skills` package if needed, then exposes the `neta-cli` entrypoint through the wrapper.

It also supports a case-local bootstrap path from GitHub:

```bash
./context-practices/cases/neta-next-collection-recommendation/scripts/setup-local-neta-from-github
./context-practices/cases/neta-next-collection-recommendation/scripts/neta-local --help
```

The case-local installer pulls from:

- [htj-baize/neta-skills](https://github.com/htj-baize/neta-skills)

and installs into:

- `context-practices/cases/neta-next-collection-recommendation/.local/vendor/neta-skills`

This path vendors the GitHub repo itself and runs `npm install` inside it. Use this mode when you want to modify the local Neta codebase for new API surfaces such as readable likes or favorites.

If `NETA_REPO_URL` is set in `context-practices/.env.local`, the local bootstrap script will clone from that repository instead of the default `htj-baize/neta-skills` URL.

If `NETA_REPO_REF` is set in `context-practices/.env.local`, the local bootstrap script will checkout that exact branch/tag/commit after clone or fetch.

The case-local scripts do not depend on a hard-coded machine path for Node. They resolve `node` and `npm` from:

- `NODE_BIN` / `NPM_BIN` when explicitly provided
- the current process `PATH`
- the user shell environment

Optional LLM rerank can be enabled by adding these values to `context-practices/.env.local`:

- `NETA_RECOMMENDER_LLM_ENDPOINT`
- `NETA_RECOMMENDER_LLM_API_KEY`
- `NETA_RECOMMENDER_LLM_MODEL`
- `NETA_RECOMMENDER_LLM_API_PATH`

If `NETA_API_BASE_URL` is omitted, the vendored `neta-skills` CLI keeps using its own default upstream API host.

When configured, the runner still performs rule rerank first and then asks the model to choose from the existing candidate set only.

Current observed state:

- the vendored repo installs successfully
- the discovered local CLI entrypoint is `skills-ref`
- if a future version exposes `neta-cli`, [`scripts/neta-local`](../scripts/neta-local) will prefer that automatically

## Runner

Option 1: set a local last-liked seed first.

```bash
./context-practices/cases/neta-next-collection-recommendation/scripts/set-last-liked-seed "<collection-uuid>"
./context-practices/cases/neta-next-collection-recommendation/scripts/run-demo
```

Option 2: pass the current collection explicitly.

```bash
./context-practices/cases/neta-next-collection-recommendation/scripts/run-demo \
  --current-collection-uuid "<collection-uuid>"
```

Option 3: force a seed source.

```bash
./context-practices/cases/neta-next-collection-recommendation/scripts/run-demo \
  --current-source liked
```

Supported values:

- `liked`
- `favorited`

Fallback mode if neither is present:

- use `get_liked_list`
- then `get_favor_list`
- then the local seed file
- then the first valid collection from the live feed

Run from the repository root:

```bash
./context-practices/cases/neta-next-collection-recommendation/scripts/run-demo
```

## Future Hook Point

The manual seed file still exists as an override seam, but the primary current-source path is now:

- actual liked list lookup
- actual favorited list lookup

## Output Artifacts

When the environment is ready, the runner will write:

- `feed.page0.json`
- `normalized-feed.json`
- `current-profile.json`
- `candidate-profiles.json`
- `recommendation.json`
- `summary.md`
- `report.html`

## Expected Result

The case should demonstrate:

- real feed-backed candidate extraction
- explicit current collection selection, preferably from the local last-liked seed
- explicit next-collection recommendation output
- rerank evidence grounded in `cta_info`, tags, themes, intents, and interaction flags
- confidence on the recommended item
- cover image and deep link for current / recommended collections
