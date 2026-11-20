# Repo guidelines for Codex

This file contains instructions for the Codex agent and its friends when working on tasks in this repository.

It is written for agents. For commands, it is authoritative: where `CONTRIBUTING.md` or
`PR_REVIEW.md` disagree with it about what to run, they are out of date.

## Commands

| To… | Run | Notes |
|---|---|---|
| run one spec while iterating | `npx gulp test-only --file test/spec/modules/xBidAdapter_spec.js` | pass the source-relative path; it is resolved under `dist/src` for you |
| re-run a spec without rebuilding | `npx gulp test-only-nobuild --file <spec>` | skips the precompile, so only correct if you have not edited sources since the last one |
| validate before you finish | `npx gulp test-only` | the whole suite, one feature variant. `--file` cannot validate — see below |
| vary a feature flag | add `--disable VIDEO,GREEDY` to a task that precompiles | your list *replaces* the default, which is `GREEDY` — include it, or you have also switched it on |
| check your change is covered | `npx gulp test-only-nobuild --file <spec>`, then read `build/coverage/chunks/1/lcov.info` | coverage is on by default; the paths in it are source-relative, so they match the files you edited |
| check a file against the 80% rule | `npx gulp test-coverage`, then `find build/coverage/chunks -name lcov.info -printf ' -a %p' \| xargs lcov -o build/coverage/coverage.info` | needs the `lcov` package. Not the same as the row above — see below |
| lint the whole repo | `npx gulp lint` | **rewrites your files** (`--fix` is on by default); `git diff` afterwards to see what it changed |
| lint only what you changed | `npx gulp lint --files src/a.ts,modules/b.js` | comma separated. Much faster than the whole repo |
| lint without touching files | `npx gulp lint --nolintfix` | this is what CI checks |
| type-check | `npx gulp ts`, then `npx gulp ts-strict` | `ts-strict` checks the emitted declarations the way a consumer's compiler sees them |
| run the non-browser tests | `npx gulp test-build-logic` | mocha; the only suite that needs no browser |
| clear the build caches | `npx gulp clean-cache` | only needed after changing the build system itself. `gulp clean` deliberately leaves the caches alone |

### Things that will cost you a wrong answer

- **`--file` iterates; it does not validate.** With `--file`, only that spec runs, so nothing about
  specs leaking global state into each other is exercised — and CI runs every spec. A spec passing
  alone does not mean the suite passes. Finish with a full `npx gulp test-only`.
- **`gulp serve-and-test`, and every other `gulp serve*` task, never exit.** They keep a server
  running, and most also watch for changes (Vitest runs in watch mode in `serve-and-test`). Do not
  reach for one as a one-shot check; it will hang until you kill it.
- **`--watch` on a gulp command line never reaches the task.** gulp passes it to Node, which then
  re-runs gulp on file changes. To watch the tests, use `npx gulp serve-and-test` or
  `npm run test:vitest:watch`.
- **`gulp test` is not your gate.** On top of `test-only` it runs `clean`, a repo-wide auto-fixing
  lint, and a second feature variant, and runs the suite twice. Use `test-only`.
- **`--file` does not narrow the Babel/precompile step.** It selects which specs run. Only
  `test-only-nobuild` skips compilation.
- **`--nolint` only does something for `gulp test` and `gulp serve`.** Every `test-only*` task, and
  `test-coverage`, already skip linting.
- **Use `--no-coverage`, never `--coverage=false`.** The latter parses to the string `"false"`, which
  is truthy, so coverage stays on.
- **`TEST_CHUNKS`, `TEST_CHUNK` and `TEST_PAT` are ignored when `--file` is given.** Without
  them a run covers the whole suite at once; you do not need to set them.
- **Never read a file's coverage off a `--file` run.** Other specs exercise it too, so only a
  whole-suite run (`test-coverage`) gives its real number. The merge in the table also combines
  per-shard reports, such as the ones CI uploads.
- **Do not run bare `npx eslint`.** Without `--cache` it *deletes* `.eslintcache`, and rebuilding it
  costs a full pass over the repo. Go through `gulp lint`, which always passes the cache flags. (CI
  runs bare `npx eslint` on purpose: it has no cache to lose, and it keeps `eslint.config.js`
  authoritative rather than letting lint configuration accumulate in the gulp task.)
- **After you rename or delete a `.ts`**, the next precompile prints
  `N cached declaration(s) had no source and were left out of 'dist/src'`. That is routine — the
  compiler keeps its old output. Anything in that list you did *not* just rename or delete is
  missing from the build, not housekeeping.
- **In a new git worktree, do not symlink `node_modules`.** webpack resolves the symlink to the
  main checkout, so the build's `node_modules` excludes (which use the worktree's path) stop
  matching and babel compiles dependencies, failing with `exports is not defined`. Run `npm ci`
  instead, or make a real copy (a plain `cp -r`, or a copy-on-write one such as
  `cp -r --reflink=auto`). Do not hard-link a copy with `cp -al`: hard links share file contents with
  the main checkout, so anything that writes to a file in place in either tree changes both.
- If you add tests, make sure they pass in this environment, not just in principle.

## Code Comments
- Default to no comment. Code shows *how*; comment only to carry *why* — a non-obvious constraint, deliberate deviation, gotcha, or workaround.
- Never narrate the code ("loop over users", "parse the body"), restate names/types/signatures, or mark block ends.
- Never narrate the change ("fixed X", "updated to Y", "as requested"). A comment must read correctly to someone seeing the file fresh who never saw the diff; change context belongs in the commit message.
- Delete by default. A comment that just restates a decision the code already reflects — "1 vCPU is deliberate", "right-sized from prod" — is dead weight even when it points to a doc: the doc is where anyone questioning it looks anyway. Keep inline only what a reader needs *at that line* and can't get from the code — a non-obvious invariant/constraint ("timeout must stay < interval — ALB rule") or a cross-file sync obligation ("keep in sync with the router's TGs").
- Comments must stand on their own with any link removed — encode the substance, never a pointer as a substitute for it. Banned: specs, section numbers, design docs — point-in-time artifacts that get superseded and rot ("spec §7" is the canonical case). Fine: a maintained doc/README at a stable path — and when the *why* is a system-level narrative ("why it's built this way"), extract it there as a *pure* extraction: not an inline block, and not a comment that merely points to the doc. What stays inline are the non-obvious local details, which reference the doc only when a reader genuinely needs it *at that line* — a pointer-only comment generally shouldn't exist at all. Tickets, Confluence, RFCs, permalinks stay fine as trailing breadcrumbs.
- Occam's razor on every comment you *keep*, not just the ones you delete. "Carries a real *why*" and "is worded minimally" are independent judgments — a genuine *why* can still be 3x too long, and "it's a real why" is not license to keep the wording verbatim. Keep only the one non-obvious fact a reader needs *at that line*, in the fewest words; cut the mechanism the code already shows, where a value is consumed downstream, the consequence-of-the-consequence, and justification-of-the-justification. A 5-line block almost never survives intact — suspect it on sight; the razored answer is sometimes zero.
- A one-line summary on a public function/endpoint is fine; inline restatement of a single clear line never is.
- TODOs are fine and don't need issue IDs — but a TODO is a marker, not a substitute for doing the work in scope.

## PR message guidelines
- Summaries should describe the changes concisely and reference file lines using the citation format. Describe your task in the PR description so reviewers are well aware of what you are attempting.
- Document the results of `gulp lint` and `gulp test-only` in the PR description if the commands are successful.
- Title module changes as `X Adapter: short description` where X is the name of an adapter, e.g. `Rubicon Bid Adapter: stylistic changes`; changes to `/src` should be titled `Core: short description`.
- Keep PRs scoped to a single change type. Add a release-notes category label (e.g. `feature` or `fix`) and a SemVer label (`major`, `minor` or `patch`); `PR_REVIEW.md` has the current list of both.

## Say when you wrote something
Anything you post to GitHub may run under a person's account, so readers will assume that person wrote it unless you say otherwise.
- Start every comment you post with a line saying an AI agent wrote it, and for whom. That covers PR and issue comments, review comments and replies, review summaries, and comments left when closing or reopening something. Example:
  `> 🤖 *This comment was written by an AI agent (<agent name>) on behalf of @<github user>.*`
  Keep that line when you edit one of your comments later.
- End PR and issue descriptions you write with a similar note, e.g. `🤖 Generated with <agent name>`.
- Don't remove or reword a person's own comments to look agent-written, or yours to look human-written.

## Issue template
- Fill out every section of `.github/ISSUE_TEMPLATE.md` when filing issues, including steps to reproduce and platform details. If there isn't an associated issue, include this template in any PR.

## General guidance
- Node.js `>=24.14.1` is required (`engines` in `package.json`); `.nvmrc` pins the version CI uses. Dependencies are managed with `npm`.
- Whenever possible, new modules should provide TypeScript types for their public interface.
- Added or modified code must have at least 80% unit test coverage. See the table above for how to measure it.
- Link any required documentation PRs in the PR description.
- To read the docs, fetch the Markdown: every docs.prebid.org page is published as its source by replacing `.html` with `.md`, e.g. `https://docs.prebid.org/dev-docs/bidders/<biddercode>.md` for a bidder's documented params and supported features. `https://docs.prebid.org/llms.txt` lists every page. The docs source is the `prebid/prebid.github.io` repo.
- Avoid modifying files in `node_modules` or generated build artifacts under `build`.
- Do not hand-edit generated files that are tracked in the repo — the release process regenerates and commits them (most through `gulp build-release`), so your change would be overwritten. Today that means `.github/codeql/queries/autogen_fp*.qll`, `integrationExamples/gpt/x-domain/creative.html` (into which `build/creative/creative.js` is inlined), the browserslist entries in `package-lock.json`, and `metadata/modules/*.json`, which `gulp update-metadata` owns. Each of these says so in its first few lines: if a file you are about to change announces that it is autogenerated, change the generator instead.
- Do not include changes to `package-lock.json` that are not relevant to the task.
- Do not include any changes to this file or any other .md file in the root directory of the repo in any pr.
- If you're examining this Prebid.js repo under owner or organization "prebid", don't open PRs against it directly: ask your user to make a fork and open the PR from there. Either way, say an agent wrote it, as described in [Say when you wrote something](#say-when-you-wrote-something). If this is a fork of prebid/Prebid.js you can ignore this bullet point.
- Always include the string 'codex' or 'agent' in any branch you create.
- `CONTRIBUTING.md` and `PR_REVIEW.md` cover contribution process and review policy; read them for that. For commands, this file wins.

## Testing scope
- When you modify or add source or test files, run only the affected unit tests while you iterate, then the full suite once before you finish.
- While iterating, avoid extra commands that rebuild all modules when only a subset are changed. The precompile that the affected-spec command itself runs (`test-only --file` precompiles everything) is fine, and so is the required full-suite run before you finish.
- Never call `it()`, `describe()` or a hook (`before`, `after`, `beforeEach`, `afterEach`) inside a test or hook.
  Mocha silently ignores them, so under Mocha their assertions never run and the spec passes anyway. Define them in
  the enclosing `describe()`, and do cleanup a test needs with `try`/`finally` in the test. The test runner's Mocha
  shim (`test/vitest/setup.mjs`) fails the running test on any of them, and lint (`mocha/no-nested-tests`) reports
  a nested `it()` or `describe()`, though not a nested hook.

## Additional context
- For additional context on repo history, consult https://github.com/prebid/github-activity-db/blob/main/CLAUDE.md on how to download and access repo history in a database you can search locally.

## Common adapter types
- When bid adapter changes need shared type references, look in the core source modules first:
  - `src/adapters/bidderFactory.ts` for bidder registration/build and bidder-spec wiring concepts.
  - `src/userSync.ts` for user sync interfaces, sync option handling, and sync registration behavior.
  - `src/adapterManager.ts` for adapter manager orchestration and type usage patterns around bidder lifecycle.
- Prefer importing or mirroring conventions from these modules instead of redefining local ad-hoc shapes.
- Use imported types for id, analytics, and rtd modules as well whenever possible.
- Always define types for the public interface of an adapter, e.g. each bidder parameter.

## Review guidelines
- Use the guidelines in `PR_REVIEW.md` when doing PR reviews. Make all your comments and code suggestions on the PR itself instead of in linked tasks when commenting in a PR review.
- Prebid.js runs on publishers' pages and works for publishers. Flag vendor code that costs the publisher something (page performance, auction latency, data, or control over their own setup) for the vendor's benefit, even when the code is correct. Ask for it to be removed, or made an opt-in the publisher controls that is off by default. A reason like "so we don't lose data" or "for our reporting" doesn't justify the cost. Examples, several with their own rules below: telemetry sent urgently instead of deferred, network requests or storage beyond what the auction needs, overriding or ignoring publisher settings (timeouts, floors, price granularity, preferred formats), and quietly changing a default in the vendor's favour.
- If a module change requires a new parameter or invalidates previously valid parameter values (e.g. stricter typing or range checks on existing params), confirm the label on the PR is `major` and hold it for a major release version. This does not apply when a bidder's service has shut down and its adapter is replaced with a no-op stub: the bidder no longer returns bids, so there are no working configurations to break.
- Use the module rules at https://docs.prebid.org/dev-docs/module-rules.html.
- Discourage `application/json` calls: they cause preflight `OPTIONS` calls, which add delay that `text/plain` avoids.
- Make sure people are importing from libraries and our methods whenever possible, e.g. on viewability or accessing navigator.
- Bidder params should always only override that information coming on the request; bidders should never make someone specify something that is generally available in an ortb2 field on the request in bidder params unless they need an override.
- Bidders asking for storage access and setting an id in local storage redundant with the shared id is discouraged; they should document why they need to do this odious behavior.
- A submodule of `userId`, `rtdModule`, `fpdModule` or `videoModule` must be registered under the matching key in `modules/.submodules.json`.
- No one should be accessing navigator from vendor modules; if navigator needs to be accessed, it should be in a common method or library.
- Low priority calls should import the ajax method and use fetch keepalive; they shouldn't use `triggerPixel` when it can be avoided or fail to specify keepalive.
- Telemetry that doesn't affect the auction or rendering (timeout, error, win/loss, latency or debug beacons) must stay off the critical path: send it with `politeTriggerPixel` (a keepalive fetch on the background task queue) or schedule it with `runBackgroundTask`, not immediately with `fetch`, `ajax` or `triggerPixel`, and never one request per bid or seat in a burst. Flag PRs that move such beacons from deferred to immediate, for example "so they aren't lost on busy pages": a page that times out usually has a busy main thread, and reporting the timeout is the least urgent work on it. If delivery on unload matters, queue the unsent beacons and flush them on `visibilitychange` to `hidden` or `pagehide` with `sendBeacon` or a keepalive fetch, removing each from the queue once sent so none goes twice.
- Analytics modules must provide a `disableAnalytics` method.
- Metadata files that say do not edit in the comments should not be edited; the build process is responsible for updating the metadata files.
- PRs should not need to modify https://github.com/prebid/Prebid.js/blob/master/metadata/overrides.mjs as module codes and module names should generally match.
- Make sure any uses of storage have a device disclosure file declared with appropriate identifier description fields set following https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/Vendor%20Device%20Storage%20%26%20Operational%20Disclosures.md#example-1 in the https://vendor-list.consensu.org/v3/vendor-list.json if they have a gvlid, if they do not have a gvlid, encourage storage disclosure metadata is committed. Also encourage any use of storage is well described in the module md file.
- Bidders should not disincentivize multiformat ad units. A bidder that supports multiple formats on an ad unit but is only capable of sending one format on a request to their endpoint should defer to publisher choices, and should not change the default preferred ad format suddenly, e.g. by adding support for video or native and suddenly preferring it. The possible outcome of this is that publishers would need to drop native declarations from units to continue to transact in banner, a bad outcome for the publisher.
- Make sure any module params are typed in a `.d.ts` file and imported into the JS, or defined inline in the TS file. Also make sure bidder or other module params are exported so anyone importing prebid's types via npm will have access to them.
