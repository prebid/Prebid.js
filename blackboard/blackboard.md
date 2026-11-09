# Mobian viewability endpoint migration

## Objective and scope

Implement `blackboard/goal.md`: replace the per-slot viewability request with one JSON file per GAM network/site, and keep the four string slot targeting keys. Change `modules/mobianRtdProvider.js`, `modules/mobianRtdProvider.d.ts`, `modules/mobianRtdProvider.md` and `test/spec/modules/mobianRtdProvider_spec.js`. Context and traffic-quality code stays as is. No PR. Don't touch root Markdown or generated files.

Reviewer1 checks for minimum code, so keep the diff small and follow the shapes already in the file (`makeMemoizedFetch`, `dep`, `viewabilityTargetingData`).

## Evidence

- Live files: `https://vp-data.themobianprebid.ai/36117602/hdm-cosmopolitan.json` (470 rows). Top-level keys `asof`, `version`, `net`, `site`, `rows`. Response has `access-control-allow-origin: *` and `cache-control: public, max-age=3600`, so the browser HTTP cache already covers reloads; the module cache only has to stop refetching within one page.
- Rows include `/36117602/hdm-cosmopolitan/homepage/atf` (path) and `/36117602/hdm-cosmopolitan/homepage/atf/gpt_lb_a` (slot). Some devices are missing on some rows; `o` appears.
- `libraries/gptUtils/gptUtils.js:42` `getGptSlotForAdUnitCode(code)` returns the GPT slot whose path or element id equals `code`, or `undefined` without GPT.
- `libraries/userAgentUtils/detailed.js` `detectDeviceType()` returns ORTB device types: 2 desktop, 3 TV, 4 phone, 5 tablet. Already used by `modules/adWMGAnalyticsAdapter.js`. `libraries/userAgentUtils/index.js` `getDeviceType()` has no TV/other value, so use `detectDeviceType`.
- Test page (`/Users/anton/mobian/dev-prebid/build/test-page.js`) defines `/19968336/header-bid-tag-0` → `div-gpt-ad-1460505748561-0` and `/19968336/header-bid-tag-1` → `div-gpt-ad-1460505748561-1`. No live file exists for those. `dev-prebid/build/` is bind-mounted, so anything placed there is served at `http://localhost:8080/build/...`.

## Behavior

1. **Enabling VP.** Unchanged: `advertiserTargeting: true` + `includeViewabilityTargeting: true`, or `vp` listed in an `advertiserTargeting` array. Drop the `viewabilityTargetingPlacementSource` gate in `getBidRequestData`, `getTargetingData` and `storeViewabilityDataForAdUnits`. Keep the param in `MobianRtdProviderParams` marked `@deprecated` and ignored, and remove it from `getConfig` output / `MobianResolvedConfig`. Remove it from the `.md` example.
2. **Endpoint.** `export const MOBIAN_VIEWABILITY_URL = 'https://vp-data.themobianprebid.ai'`. File URL is `${MOBIAN_VIEWABILITY_URL}/${network}/${site}.json`, where `network` and `site` are the first two segments of `slot.getAdUnitPath()` split on `/` (leading empty segment dropped). Pass each through `encodeURIComponent`. If GPT has no slot for the code, or the path has fewer than two nonempty leading network/site segments, skip that code: no request, no targeting. Use the segments as they are (no special handling of MCM `parent,child` network codes; not seen in the live data).
3. **Fetch.** In `getBidRequestData`, for each unique `adUnit.code` (same source as today: `bidReqConfig.adUnits || getGlobal().adUnits`), find the file URL, dedupe the URLs, and fetch each once through a memoized fetcher keyed by file URL. Reuse the `makeMemoizedViewabilityFetch` shape: `Map` of URL → promise, FIFO eviction at `VIEWABILITY_TARGETING_MAX_CACHE_SIZE` (lower it to 10 — one page rarely has more than a couple of sites), and `cache.delete(url)` on failure so the next auction retries. No promise-identity guard; the existing fetchers don't have one and it isn't needed for this.
4. **Parsing.** `makeViewabilityDataFromResponse(response)` → `safeJSONParse` if string, then return `data.rows` if it is a plain object, else throw (so the failure path deletes the cache entry and retries). Store the resolved rows in `viewabilityTargetingData` keyed by file URL (replaces today's page/code/source key). Keep the existing size bound on that map.
5. **Targeting (`getTargetingData`, sync, no network).** For each `adUnitCode`: get the slot again, build the file URL, read rows from `viewabilityTargetingData`. `path = slot.getAdUnitPath()` with one trailing `/` stripped. Slot key = `path` + `/` + `adUnitCode` (not `getSlotElementId()`, not `adid`). Pick `rows[slotKey]?.[device] ?? rows[path]?.[device]`: the slot row first, then the path row for the same device. No fallback to another device or to `o`. Because the slot and path are looked up at targeting time, no extra code is needed for a code that moves to another path.
6. **Device.** `const DEVICE_CODES = {2: 'd', 4: 'm', 5: 't'}`; anything else → `'o'`. Call `dep.detectDeviceType()` inside `getTargetingData` (it's a few regexes). Putting it on `dep` lets tests stub it instead of faking `navigator.userAgent`.
7. **Tuple → targeting.** Emit keys only if `Array.isArray(tuple) && typeof tuple[0] === 'number' && tuple[1] != null && tuple[2] != null`. Values: `${prefix}_vp_likely_viewable: String(tuple[0] >= 0.5)`, `${prefix}_vp_probability: String(tuple[0])`, `${prefix}_vp_bucket_percent: String(tuple[1])`, `${prefix}_vp_confidence: String(tuple[2])`. All four or none. No range/enum/multiple-of-5 checks; this is our own server's file and the old code didn't range-check either.
   Also set `${prefix}_vp_key_found`: `'true'` if `slotKey` is a key in `rows`, even when that row has no entry for the device, else `'false'`. A path-row fallback still gives `'false'`. Set it whenever the slot's file has loaded, even if the four prediction keys are not set. If the file hasn't loaded (no GPT slot, still pending, or failed), set no keys for that slot, including this one.
8. **Failures.** One file failing only drops targeting for slots on that file. Context/TQ results and callback-once behavior in `getBidRequestData` stay as they are (`Promise.all(...).catch().finally(callback)`).
9. **Types.** In `.d.ts`: add `MobianViewabilityDevice = 'd' | 'm' | 't' | 'o'`, `MobianViewabilityPrediction = [probability: number, bucketPercent: number, confidence: string]`, `MobianViewabilityRows = Record<string, Partial<Record<MobianViewabilityDevice, MobianViewabilityPrediction>>>`. Keep `MobianViewabilityData` (the four strings) for the targeting values. Update JSDoc typedefs in the `.js`.
10. **Docs (`.md`).** Replace the `vp` description: one file per GAM network/site from the slot's ad unit path, lookup key `<ad unit path>/<ad unit code>` with fallback to the `<ad unit path>` row, device from the user agent, `likely_viewable` is `probability >= 0.5`, `key_found` meaning, no prediction keys when neither row has the device, GPT slots must be defined before `requestBids` so the file can be found. Mark `viewabilityTargetingPlacementSource` deprecated.

Targeting keys are now `mobian_vp_likely_viewable`, `mobian_vp_probability`, `mobian_vp_bucket_percent`, `mobian_vp_confidence` and `mobian_vp_key_found` (with the configured prefix). Add `key_found` to the targeting key list in the `.md`.

When the ad unit code *is* the GAM path, the slot key becomes `path//path`, so it never matches. The slot gets the path row and `key_found` `'false'`. No special handling; the user chose path + code.

## Required tests

Replace the old viewability tests (URL with `placement_source`, `results.viewability`, per-code cache). Keep all context/TQ tests. Stub GPT with `window.googletag.pubads().getSlots()` returning fake slots (`getAdUnitPath`, `getSlotElementId`), and restore it in `afterEach`. Stub `dep.ajaxBuilder` and `dep.detectDeviceType`. Clear the fetch cache and `viewabilityTargetingData` between tests (export a small reset helper or build fresh fetchers via `makeMemoizedViewabilityFetch`).

1. URL from path: `/36117602/hnp-seattlepi.com/news/atf` → `https://vp-data.themobianprebid.ai/36117602/hnp-seattlepi.com.json`.
2. Two codes on the same site → one request. Codes on two sites → two requests.
3. Fallback and `key_found`, with a file that has `/…/homepage/atf` and `/…/homepage/atf/gpt_lb_a`:
   - code `gpt_lb_a`, device in slot row → slot row values, `key_found` `'true'`.
   - code `gpt_gal_a` (no slot row), device in path row → path row values, `key_found` `'false'`.
   - code `gpt_lb_a`, device missing from slot row but in path row → path row values, `key_found` `'true'`.
   - neither row has the device, or neither row exists → only `key_found` set.
   - file not loaded (pending, failed, no GPT slot) → no keys at all.
4. Device mapping 2→d, 4→m, 5→t, 3→o. No fallback to another device or `o`.
5. `likely_viewable`: probability 0 and bucket 0 remain valid; probability 0.4999 → `'false'`, 0.5 → `'true'`. All values are strings; custom `prefix` applied.
6. No GPT / no matching slot / one-segment path → no request, no targeting, callback still called.
7. Request failure or `rows` missing → no targeting; next `getBidRequestData` refetches. Success → next auction does not refetch.
8. `getTargetingData` before the file resolves returns `{}` and makes no request.
9. VP not enabled → no request; `viewabilityTargetingPlacementSource` not required.
10. One file fails, another succeeds → the successful slot still gets keys and context data is still added.

11. Keep/adapt existing FIFO eviction and invalid-cache-size tests; add two concurrent fetch calls sharing the same promise/request. Empty `rows: {}` is successful and cached; invalid JSON and null/array `rows` retry. Missing/incomplete selected tuples emit no keys.
12. Reuse one code with a different GPT path and verify it does not receive the old path's prediction. A new code in an already fetched file can use its own row. These verify the main correctness reason for resolving paths at targeting time, without introducing extra cache machinery.

No nested `it`/`describe`/hooks.

## Validation

- Iterate: `npx gulp test-only --file test/spec/modules/mobianRtdProvider_spec.js`.
- Lint: `npx gulp lint --files modules/mobianRtdProvider.js,modules/mobianRtdProvider.d.ts,test/spec/modules/mobianRtdProvider_spec.js`, then `git diff`.
- Types: `npx gulp ts`, then `npx gulp ts-strict`.
- Before READY_FOR_REVIEW: full `npx gulp test-only`. Coverage check per AGENTS.md: changed code needs at least 80% coverage; use whole-suite coverage rather than a focused-spec report for file totals.

## Browser check (coder1)

1. Build and copy as in `goal.md` (`gulp build-bundle-dev --modules=…` then `cp -f build/dev/prebid.js /Users/anton/mobian/dev-prebid/build`).
2. Fixture: write `/Users/anton/mobian/dev-prebid/build/vp/19968336/header-bid-tag-0.json` with a `rows` entry for `/19968336/header-bid-tag-0/div-gpt-ad-1460505748561-0` (all four devices), and leave `header-bid-tag-1` without a file to see the 404 path.
3. In the copied bundle only, `sed` the `https://vp-data.themobianprebid.ai` string to `http://localhost:8080/build/vp`. Never commit that; the repo constant stays the production URL.
4. Load `http://localhost:8080/` with Chrome tools. Check: one request per site file, `googletag.pubads().getSlots()[0].getTargeting('mobian_vp_probability')` matches the fixture and `mobian_vp_key_found` is `'true'`, slot 1 has no `mobian_vp_*` keys, no console errors. Then change the fixture's row key to the path only (`/19968336/header-bid-tag-0`), reload, and check slot 0 gets the same values with `mobian_vp_key_found` `'false'`.
5. If Chrome tools can't connect, stop and tell the user; don't claim end-to-end success.
6. The fixture and copied bundle are outside the writable workspace; use the required filesystem escalation for writes. Restore the copied bundle to the production URL after testing. Remove only fixtures created for this task, or tell the user what remains. The expected fixture 404 may appear in the console; distinguish it from module exceptions.

## Planning decisions

planner1 accepts the simplified implementation: reuse existing bounded caches, retain light tuple validation consistent with the old contract, and avoid additional race/re-association machinery. A late failed evicted request may cause an extra retry in the extreme cache-churn case; this migration does not promise exact-once requests under eviction. Lowering the file cache cap to 10 is appropriate. Tests above retain regression checks for the cache behavior we do promise. No unresolved product decision remains.

User decisions (2026-11-09, after planner approval): slot key stays path + `/` + ad unit code; fall back to the path row for the same device; add `mobian_vp_key_found`. Behavior 5/7/10 and test 3 reflect this. Blocking user note `user.20261109T175953Z.3d2b78bb` says the same; ack it once these items are done.
