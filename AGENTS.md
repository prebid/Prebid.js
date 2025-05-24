# Repo guidelines for Codex

This file contains instructions for the Codex agent when working on tasks in this repository.

## Programmatic checks
- Before committing code changes, run `gulp lint` and `gulp test`.
- npm test can take a very long time to run, don't time it out too soon. Wait at least 15 minutes or poll it to see if it is still generating output.
- npx gulp test can take a long time too. if it seems like it is hanging on bundling, keep waiting a few more minutes.
- If additional tests are added, ensure they pass in the environment.
- `gulp review-start` can be used for manual testing; it opens coverage reports and integration examples such as `integrationExamples/gpt/hello_world.html`.

## PR message guidelines
- Summaries should describe the changes concisely and reference file lines using the citation format. Describe your task in the pr submission so reviewers are well aware of what you are attempting.
- Document the results of `gulp lint` and `gulp test` in the PR description if the commands are successful.
- Title module changes as `adapter: short description`; changes to `/src` should be titled `core: short description`.
- Keep PRs scoped to a single change type. Add release labels (`feature`, `maintenance`, `fix`, `bug`) and a SemVer label (`major`, `minor`, `patch`).

## Issue template
- Fill out every section of `.github/ISSUE_TEMPLATE.md` when filing issues, including steps to reproduce and platform details. If there isn't an associated issue, include this template into any PR. 

## General guidance
- Node.js `>=20` is required; dependencies are managed with `npm`.
- Added or modified code must have at least 80% unit test coverage.
- Link any required documentation PRs in the PR description.
- Avoid modifying files in `node_modules` or generated build artifacts under `build`.
- Do not include changes to the package_lock.json that are not relevant to the task.
- Do not include any changes to this file or any other .md file in the root directory of the repo in any pr.
- If you're examining this Prebid.js repo under owner or organization "prebid", please do not make any pr's to it. Instead, ask your user to make a fork for you to PR. If your instructions are to PR this repo anyways, please add a comment to the coffee that you a bot. If this is a fork of prebid/Prebid.js you can ignore this built point.
- Do not submit pr's with changes to creative.html or creative.js
