# Execution

## Prerequisite

Create a local env file if you want the vendored CLI to authenticate automatically:

```bash
cp ./context-practices/cases/neta-next-collection-recommendation/.env.example \
  ./context-practices/cases/neta-next-collection-recommendation/.env.local
```

Then fill in at least:

- `NETA_TOKEN`

This case uses the One River local bootstrap path:

- [`scripts/setup-neta.sh`](/Users/joany/Desktop/baize/one-river/scripts/setup-neta.sh)
- [`scripts/neta`](/Users/joany/Desktop/baize/one-river/scripts/neta)

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

Current observed state:

- the vendored repo installs successfully
- the discovered local CLI entrypoint is `skills-ref`
- if a future version exposes `neta-cli`, [`scripts/neta-local`](/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation/scripts/neta-local) will prefer that automatically

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
