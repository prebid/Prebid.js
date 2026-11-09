# Mobian viewability endpoint migration

## Objective and scope

Implement `blackboard/goal.md`: replace per-slot prediction requests with GAM network/site JSON files while preserving the four string-valued slot targeting keys. Change `modules/mobianRtdProvider.js`, its exported `.d.ts` types, module documentation, and `test/spec/modules/mobianRtdProvider_spec.js`. Preserve contextual and traffic-quality behavior. No PR is requested; do not modify root Markdown or generated tracked files.

## Evidence

- Both supplied live JSON files were fetched successfully with curl on this planning turn. Top-level keys are `asof`, `version`, `net`, `site`, `rows`; rows contain device-to-tuple mappings, including `o` in the Cosmopolitan file. Samples are available in `/tmp/mobian-vp-cosmopolitan.json` and `/tmp/mobian-vp-seattle.json` for inspection, not committed fixtures.
- `libraries/gptUtils/gptUtils.js:getGptSlotForAdUnitCode` resolves current slots without the separate slot-info cache. The model's site is the second nonempty ad-unit-path segment; network is the first.
- `libraries/userAgentUtils/detailed.js:detectDeviceType` returns desktop=2, phone=4, tablet=5, TV=3. Its mapping can cover d/m/t/o without module-to-module imports or direct navigator access. The simpler index helper has only desktop/mobile/tablet and defaults all others to desktop.
- Current code gates VP on `viewabilityTargetingPlacementSource`, caches per page/code/source, and expects `results.viewability`; those behaviors must change. Existing context/TQ helpers and tests remain applicable.

## Proposed behavior

1. Keep VP opt-in semantics: `advertiserTargeting: true` requires `includeViewabilityTargeting: true`; explicit `advertiserTargeting: ['vp']` enables it directly. Publisher-only VP does not initiate fetches. Remove placement-source gating. Keep its public optional parameter accepted as deprecated/ignored so existing configs still type-check; documentation must no longer instruct publishers to provide it. No replacement required publisher parameter.
2. Resolve each requested ad-unit code using `getGptSlotForAdUnitCode`, read `getAdUnitPath`, and derive endpoint `https://vp-data.themobianprebid.ai/<network>/<site>.json`. Encode each URL component separately. Skip absent GPT/slots and structurally invalid paths without throwing or requesting. Do not derive GAM identity from the page hostname or require per-bidder params.
3. The lookup key is the full GAM path plus `/` plus the supplied ad-unit code, as explicitly requested in the goal. Do not substitute the GPT element ID or GPID. Normalize trailing path slash only for concatenation; preserve case and internal path segments. No fallback to a path-only row, parent placement, another device, or `o` when the selected device row is absent.
4. Select device with the shared detailed library, mapping 2->d, 4->m, 5->t, and other values->o. Document that this inherits the library's UA detection limits; do not expand device-detection scope in this migration.
5. During `getBidRequestData`, fetch distinct network/site files needed by that auction, deduplicating simultaneous and subsequent requests by endpoint identity, independent of page URL, slot, and device. Retain bounded caching with a documented finite default and sanitized size argument. Successful empty rows are cacheable. Network failure, invalid JSON, and malformed top-level rows are retryable on a later invocation. Do not cache failures permanently. Guard failure deletion by promise identity if eviction can allow replacement before an old promise rejects.
6. Store completed file rows for synchronous `getTargetingData`. Prefer one bounded per-file cache plus a pending-fetch cache, or an equivalent design that bounds retained results as well as promises. Resolve slot/path again when returning targeting to avoid stale values when a code is reused for another GAM path. A newly introduced slot can use an already fetched file. Missing data returns no keys; no network work in synchronous targeting hook. Prevent pending requests from associating results with a changed slot path.
7. Validate the selected tuple before emitting targeting: array with three usable values, finite numeric probability in [0,1], finite numeric bucket in [0,100] at a multiple of five, confidence low/medium/high. Do not coerce malformed data into predictions. Emit all four strings or none: probability and server-supplied bucket unchanged via String, confidence, and `String(probability >= 0.5)`. Do not recompute or round bucket values.
8. A file failure affects only that file. Context/TQ and other successful file targeting survive. Preserve callback-once completion and RTD auction-delay behavior; do not add an extra GPT wait that can hang the callback.
9. Export the new JSON response/device/tuple types alongside existing public config/targeting types and annotate affected JS helpers. Correct docs to explain file caching, exact slot/device matching, missing-data behavior, obsolete placement source, and GPT slots needing to exist when the bid hook collects file identities.

## Required tests

- Endpoint construction from GPT paths, dotted/hyphenated site names, component encoding, same-site slots -> one HTTP request, different sites/networks -> separate requests.
- Exact slot selection in a file containing different path-only and slot predictions; two slots sharing a path get distinct targeting. Custom prefix and requested-code filtering preserved.
- d/m/t/o mapping through the shared helper; absent selected-device row produces no fallback.
- Probability 0, just below .5, exactly .5, and 1; zero bucket; server bucket retained. Invalid/missing rows, malformed tuples, null/scalar/array row containers, invalid JSON, nonfinite/out-of-range numeric values, and missing confidence produce safe behavior.
- Missing GPT, unmatched code, short/empty path, empty ad-unit list, duplicate codes; VP disabled and publisher-only VP; old placement parameter is optional and ignored.
- Concurrent calls share an in-flight request; successful files reused across page URLs, slots and later auctions; retry after network/parse/schema failures; cache eviction and invalid max sizes; delayed rejected evicted request cannot delete a newer entry.
- Slot code reused with a different path does not return old targeting; newly requested slot can use cached file; no data until response completes; synchronous targeting makes no request.
- Mixed site failures retain other site results and context/TQ; callback once; preserve global-ad-unit fallback and existing non-VP tests. Restore GPT globals, device stubs and caches so tests pass in the full suite. No nested tests/hooks.

## Validation and browser acceptance

Iterate with `npx gulp test-only --file test/spec/modules/mobianRtdProvider_spec.js`. Run scoped `npx gulp lint --files modules/mobianRtdProvider.js,modules/mobianRtdProvider.d.ts,test/spec/modules/mobianRtdProvider_spec.js` and inspect fixes. Run `npx gulp ts` then `npx gulp ts-strict`. Before finishing implementation run full `npx gulp test-only` once; use full-suite coverage tooling for the 80% requirement, never infer overall file coverage from a focused spec. Follow AGENTS.md command precedence.

For browser acceptance use the supplied narrow `npx gulp build-bundle-dev --modules=consentManagementGpp,consentManagementTcf,gppControl_usnat,gppControl_usstates,gptPreAuction,storageControl,tcfControl,mobianRtdProvider`, then copy build/dev/prebid.js to /Users/anton/mobian/dev-prebid/build/prebid.js (requires filesystem approval outside workspace). Inspect localhost:8080 using available Chrome tools and the relevant Prebid skill. First use live files with matching GPT paths/codes; verify request count, RTD map and applied GPT keys. For deterministic data prefer browser network interception with a small fixture, if supported, without editing generated bundle content or adding a production endpoint override. If Chrome cannot connect or matching slots cannot be configured, report the concrete blocker to the user as requested; do not claim end-to-end success. Never commit local dev artifacts.

## Planning review requested

planner2 should scrutinize cache ownership/race behavior, deprecated placement-source compatibility, path validation (including unusual GAM network syntax), tuple validation scope and device-helper choice. Confirm the plan is sufficiently concrete for implementation and adjust any unnecessary complexity. This first turn is WORKING, not approval.
