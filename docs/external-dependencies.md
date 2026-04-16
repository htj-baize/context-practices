# External Dependencies

The first three practice cases depend on external context-family CLIs:

- `cw`
- `cs`
- `cgp`

`context-practices` now provides a local bootstrap and wrapper layer so users do not need to know the sibling repository layout.

## Bootstrap

From the repository root:

```bash
./context-practices/scripts/bootstrap-external-cases
```

This script will:

1. use sibling repositories if they already exist
2. otherwise clone the missing repositories into `context-practices/.external/`
3. create `.venv` for each external repository
4. install each repository in editable mode

## Wrappers

Case runners no longer call sibling repository paths directly.

They now call:

- `./context-practices/scripts/cw`
- `./context-practices/scripts/cs`
- `./context-practices/scripts/cgp`

The wrapper resolution order is:

1. explicit env override (`CW_BIN`, `CS_BIN`, `CGP_BIN`)
2. sibling repositories in the workspace
3. managed repositories under `context-practices/.external/`
4. matching commands on `PATH`

## What this solves

This makes the repository operationally self-contained:

- users can bootstrap from inside `context-practices`
- case runners stop depending on hard-coded sibling paths
- missing external CLIs can be provisioned automatically

## What this does not solve

This is not fully offline self-containment yet.

If the sibling repositories are absent, bootstrap still needs network access to clone:

- `context-weave`
- `context-skills`
- `context-gameplay`

For full offline self-containment, the next step would be one of:

- git submodules
- vendored source
- published package dependencies with a lockfile
