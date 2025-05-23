# Repo guidelines for Codex

This file contains instructions for the Codex agent when working on tasks in this repository.

## Programmatic checks
- Before committing code changes, run `gulp lint` and `gulp test`.
- If additional tests are added, ensure they pass in the environment.
- `gulp review-start` can be used for manual testing; it opens coverage reports and integration examples such as `integrationExamples/gpt/hello_world.html`.

## PR message guidelines
- Summaries should describe the changes concisely and reference file lines using the citation format.
- Document the results of `gulp lint` and `gulp test` in the PR description.
- Title module changes as `adapter: short description`; changes to `/src` should be titled `core: short description`.
- Keep PRs scoped to a single change type. Add release labels (`feature`, `maintenance`, `fix`, `bug`) and a SemVer label (`major`, `minor`, `patch`).

## Issue template
- Fill out every section of `.github/ISSUE_TEMPLATE.md` when filing issues, including steps to reproduce and platform details.

## General guidance
- Node.js `>=20` is required; dependencies are managed with `npm`.
- Added or modified code must have at least 80% unit test coverage.
- Link any required documentation PRs in the PR description.
- Avoid modifying files in `node_modules` or generated build artifacts under `build`.
