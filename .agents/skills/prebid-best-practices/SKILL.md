---
name: prebid-best-practices
description: Audit a live Prebid.js page through Chrome DevTools MCP for GPID on bid requests, relevant consent management modules, positive bid floors, and GPT request-hook orchestration. Use when asked to check Prebid setup, auction best practices, or whether a site sends GPID, handles consent, sets floors, or coordinates Prebid auctions before GPT ad requests.
---

<!-- Authored by an agent. -->

# Audit Prebid best practices

Use the page's **Prebid.js DevTools** tool group to inspect runtime state, then
use Chrome DevTools network evidence when the question is specifically whether
data was **sent** to a bidder. This is a sampled runtime audit of the page and
auction tested, not a compliance certification.

## Connect and choose a sample

1. Follow the sibling `$prebid-chrome-devtools` skill to connect Chrome
   DevTools MCP, enable Prebid debug if needed, and discover the page-provided
   `summary`, `auctions`, and `events` tools. If the server lacks
   `list_3p_developer_tools` or `execute_3p_developer_tool`, complete that
   setup before auditing. Do not claim a check passed when the tools could not
   be reached.
2. Navigate to the user-specified page and let its normal auction run. If
   there is no auction, use the site's ordinary lazy-load or refresh path to
   collect a sample. Record the URL, time, Prebid version, `instance`, and
   auction ID. A page can have multiple Prebid
   instances; keep each instance's results separate.
3. Call `execute_3p_developer_tool` with `toolName: "summary"` and `params` set
   to the JSON string `"{}"`. Use its `installedModules`, `config`, and
   `latestAuction` to select an instance and auction. Then call `auctions` with
   JSON-stringified params such as
   `{"instance":"pbjs","auctionId":"<auction-id>"}`. Include another
   auction when lazy-loaded units or refreshes differ. Use `events` only if
   timing or missing auctions need explanation.
4. If no eligible bid requests exist, report GPID and active-floor checks as
   **not observed**. The module and config inventory can still be reported.

## Check GPID

- For every sampled `eligibleBidRequests` entry, inspect
  `ortb2Imp.ext.gpid`. Count a non-empty string as **present in Prebid's bid
  request**. List the ad unit and bidder for missing, blank, or inconsistent
  values. Check the same ad unit across refreshes for a stable placement ID;
  multiple placements must remain distinguishable. `ortb2Imp.ext.data.pbadslot`
  and `adUnitCode` are useful context but are not proof of GPID.
- Check `installedModules` for `gptPreAuction` and `config.gptPreAuction` to
  explain how GPID may be populated. An explicitly supplied GPID can be valid
  without that module; installing the module alone does not prove output.
- If the user asks whether GPID is **sent**, inspect the corresponding bidder
  request in Chrome DevTools network tools. Find the request by auction time,
  bidder, and ad unit, then verify the bidder's actual GPID field (often
  `imp[].ext.gpid` in OpenRTB, but adapters use different payloads). Record
  which bidder request was checked. If the payload is opaque, encrypted, or
  inaccessible, report **present in Prebid request; outbound delivery
  unverified**. Do not infer delivery from `ortb2Imp` alone.

## Check consent modules

- Inspect the chosen instance's `installedModules` for
  `consentManagementTcf`, `consentManagementGpp`, and
  `consentManagementUsp`. Report which are present. Read
  `config.consentManagement` to see whether the relevant `gdpr`, `gpp`, or
  `usp` path is configured; older TCF setups may use top-level `cmpApi`.
- Ask which privacy regimes or audiences the site needs to support if the
  user has not supplied that scope. Until known, describe missing modules as
  **needs review**, not an unconditional failure. Do not require all three
  modules for every page.
- Installed and configured are separate observations. Neither proves that a
  CMP responded or that a consent signal reached bidders. If that question is
  in scope, inspect a relevant auction and corresponding network payload for
  the expected signal, without printing raw consent strings. Test only where
  the regime applies; a missing signal in another location is inconclusive.

## Check floors

- Inspect `installedModules` for `priceFloors` and `config.floors` for
  `enabled`, `floorMin`, `data`, `endpoint`, and `skipRate`. Global config can
  be empty while a rule is supplied on an ad unit or fetched dynamically.
- For each sampled request, inspect `floorData`, including `skipped`,
  `skippedReason`, `location`, `floorMin`, and `fetchStatus`. Inspect
  `bidsReceived` and `bidsRejected` for `floorData.floorValue` and
  `floorData.floorCurrency`. A positive `floorValue` on a response is direct
  evidence of a resolved floor for that bid. A positive `floorMin` is evidence
  of a configured minimum, not proof that a rule matched. A `floorData` object
  with `skipped: true` or `location: "noData"` is not proof of an active rule.
- Also inspect `ortb2Imp.bidfloor` with `bidfloorcur` when present. A positive
  value is evidence of an explicit impression floor, but verify whether it
  reached the outbound request before claiming it was sent. For OpenRTB
  traffic, inspect `imp[].bidfloor` and `imp[].bidfloorcur`; other adapters may
  encode floors differently. If responses are absent, use valid positive
  values in `config.floors.data.values` or an ad unit's floor rules only as
  **configured**, not **applied** evidence.
- Report per ad unit where possible. Zero, `null`, missing, skipped, and
  failed-to-fetch floors do not satisfy an active positive-floor check. Do not
  use a rejected bid alone to conclude that every request carried a floor;
  check `rejectionReason` and the associated `floorData`.

## Check GPT request orchestration

- Evaluate `typeof window.googletag?.pubads === 'function'` in the page. If
  Google Publisher Tag is not present, report **not applicable**.
- GPT's experimental `googletag.pubads().registerRequestHook` API is the
  preferred, modern way to coordinate Prebid auctions before GPT ad requests
  without `disableInitialLoad` or manual `bidsBackHandler` / failsafe timers.
  Traditional `disableInitialLoad` + `bidsBackHandler` + `refresh()` setups
  remain acceptable when every GPT request is properly coordinated.
- Read `googletag.getConfig('disableInitialLoad').disableInitialLoad` to see
  whether initial ad requests are gated manually (`true`) or driven by GPT
  (`false`). GPT exposes no runtime getter for registered hooks or
  `requestHookTimeoutMs`, so infer hook coordination from runtime sequencing
  (`disableInitialLoad` is `false` while initial `display()` and GPT-initiated
  requests wait for Prebid without a page `refresh()` call). When page source
  is inspected, verify `registerRequestHook` (awaiting `pbjs.que`, mapping
  `slots` via `getSlotElementId()`, `getAdUnitPath()`, or
  `config.customGptSlotMatching`, running `await pbjs.requestBids`, and calling
  `pbjs.setTargetingForGPTAsync`) and `googletag.setConfig({
  requestHookTimeoutMs })` set to `"auto"` or a positive millisecond value
  slightly above `bidderTimeout` / the `requestBids({ timeout })` override.
- Compare Prebid `events` (`auctionInit`, `auctionEnd`, `setTargeting`) against
  outbound GPT ad requests (`gampad/ads` and their `prev_scp` / `scp` targeting
  parameters) across initial load and any lazy loads or refreshes (`refresh()`,
  bfcache restore, heavy-ad intervention, or viewability auto-refresh):
  - Every `gampad/ads` request for Prebid-configured slots, including
    GPT-initiated lazy loads and refreshes, must fire **after** an
    `auctionInit` -> `auctionEnd` -> `setTargeting` sequence covering those
    slots (unless the auction exceeded the hook or failsafe timeout).
  - Whenever `setTargeting` emitted `hb_*` keys for a slot, the outbound
    `gampad/ads` `prev_scp` / `scp` parameter must match that payload (with
    `config.useBidCache`, `setTargeting` may legitimately pick an eligible
    unused, unexpired bid from an earlier auction).
- Report **coordinated (`registerRequestHook`)** when `disableInitialLoad` is
  `false` and every sampled `gampad/ads` request for Prebid-configured slots
  follows a fresh auction and `setTargeting` with matching `hb_*` keys. Report
  **coordinated (`disableInitialLoad`)** when `disableInitialLoad` is `true`,
  every sampled request follows `setTargeting` with matching `hb_*` keys, and
  no unhooked GPT-initiated requests occur (recommending `registerRequestHook`,
  currently experimental, as the preferred modern option for GPT + Prebid.js
  integration). Report **racing or unhooked refresh**
  when a `gampad/ads` request fires before `setTargeting` completes (within
  timeout), a GPT-initiated request fires without an auction, or `prev_scp` /
  `scp` carries stale `hb_*` keys that do not match the preceding
  `setTargeting` payload.

When a check fails, recommend the smallest relevant change: populate
`ortb2Imp.ext.gpid` directly or configure `gptPreAuction` for missing GPID;
include and configure the applicable consent module and CMP for a missing
consent integration; add a positive floor rule through `priceFloors` or an
ad unit's floor data; or coordinate GPT ad requests (for example, via
`googletag.pubads().registerRequestHook` as shown in
`integrationExamples/gpt/hello_world_request_hook.html`, with
`requestHookTimeoutMs` set to `"auto"` or slightly above `bidderTimeout` / the
`requestBids` `timeout`) so initial `display()`, lazy loading, and refreshes
await a fresh Prebid auction and `setTargetingForGPTAsync`. Suggest a follow-up
auction to verify the change.

## Report

Use one row per check (and per affected ad unit or bidder when results differ):

| Check | Verdict | Evidence | Next action |
| --- | --- | --- | --- |
| GPID | present / missing / unverified / not observed | instance, auction ID, ad unit, request field; outbound field if checked | precise fix or verification |
| Consent modules | installed / missing / needs review | exact module names, relevant config path, applicable regime | install/configure only what applies |
| Floor | applied / configured / missing / skipped / not observed | request or bid field, value and currency, skip reason | precise fix or verification |
| GPT orchestration | coordinated (`registerRequestHook`) / coordinated (`disableInitialLoad`) / racing or unhooked refresh / not applicable | GPT config, Prebid `events` vs. `gampad/ads` timing and `hb_*` targeting across load/refresh | precise fix or verification |

Separate **observed Prebid state** from **outbound network evidence**. Keep
consent strings, bidder secrets, and complete bid payloads out of the report.
Name any blocked checks and the reason. Do not change live auction settings,
consent state, floor rules, or bidder calls just to make a check pass.
