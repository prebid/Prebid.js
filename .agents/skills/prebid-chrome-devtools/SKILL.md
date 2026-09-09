---
name: prebid-chrome-devtools
description: Install and use Chrome DevTools MCP's experimental third-party developer tools to inspect a live Prebid.js page. Use when an agent needs to configure chrome-devtools-mcp for Prebid.js, discover the Prebid.js DevTools tool group, diagnose auctions, bids, no-bids, wins, floors, TTL/cache eligibility, event timing, installed modules, runtime configuration, or multiple Prebid instances, and correlate that runtime state with browser console and network evidence.
---

# Prebid Chrome DevTools

Inspect Prebid's runtime through its page-provided `summary`, `auctions`, and
`events` tools. Treat the integration as experimental and confirm discovery
instead of assuming that it is active.

## Install Chrome DevTools MCP

First check for the specific `list_3p_developer_tools` and
`execute_3p_developer_tool` tools. Generic Chrome DevTools MCP tools are not
enough: an existing server started with its default arguments omits these two
third-party tools.

- If both third-party tools are present, keep the existing server and continue
  to [Prepare Prebid.js](#prepare-prebidjs).
- If generic Chrome DevTools MCP tools are present but the third-party tools are
  absent, reconfigure the existing server to append
  `--categoryExperimentalThirdParty=true`, preserving any browser connection or
  other custom arguments. Restart the MCP client because a running server's
  startup arguments cannot be changed. Do not register a duplicate server.
- If no Chrome DevTools MCP tools are present, install the server as described
  below.

When Codex CLI is available and the server is absent, run:

```bash
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --categoryExperimentalThirdParty=true
```

For an existing Codex registration, inspect it with
`codex mcp get chrome-devtools`. Update the corresponding MCP configuration so
its `args` retain the existing values and include
`--categoryExperimentalThirdParty=true`; then restart Codex. If the CLI or
client cannot edit a registration in place, remove and re-add it only after
recording and restoring all of its existing arguments and environment settings.

For another MCP client, add the equivalent server configuration:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--categoryExperimentalThirdParty=true"
      ]
    }
  }
}
```

Restart the MCP client after changing its configuration. Never claim that the
server is usable until its browser tools appear. Mention that the server can
inspect browser content and therefore must not be attached to a profile or page
containing secrets or personal data.

### Launch Chrome with the feature available

The experimental switch belongs to the `chrome-devtools-mcp` process, not to
the Chrome executable. Let the configured MCP server launch Chrome normally;
because its arguments include `--categoryExperimentalThirdParty=true`, the
Chrome session it controls exposes `list_3p_developer_tools` and
`execute_3p_developer_tool` to the agent. To verify the setup outside an MCP
client, launch the server directly with the same switch:

```bash
npx -y chrome-devtools-mcp@latest --categoryExperimentalThirdParty=true
```

Do not invent or add a similarly named `--chrome-arg`: there is no separate
Chrome browser flag for this integration. When attaching the MCP server to an
already-running debuggable Chrome with `--browser-url`, `--ws-endpoint`, or
`--auto-connect`, keep `--categoryExperimentalThirdParty=true` on the MCP server
command line.

As of **2026-09-01** and `chrome-devtools-mcp` **1.8.0**, third-party developer
tools are experimental, disabled by default, and subject to API changes. Before
configuring a newer release, run `npx -y chrome-devtools-mcp@latest --help` and
consult the upstream guide. If the feature has graduated or the option has been
renamed or removed, follow the current upstream interface rather than forcing
this historical experimental switch.

## Prepare Prebid.js

1. Open or navigate to the target page with Chrome DevTools MCP.
2. Enable Prebid debugging in page context if it is not already enabled:

   ```js
   () => {
     window.pbjs?.setConfig({debug: true});
     return window.pbjs?.getConfig('debug');
   }
   ```

   Adapt `pbjs` to the page's Prebid global when necessary. Prefer the page's
   known global over guessing.
3. Wait briefly for `devtoolsMcp-standalone.js` to load. A build that includes
   `devtoolsMcp` installs it directly; otherwise debug mode triggers its
   on-demand standalone loader.
4. Call `list_3p_developer_tools`. Expect a group named `Prebid.js DevTools`
   with `summary`, `auctions`, and `events`.

If discovery fails, check in this order:

- Confirm that the MCP server was started with
  `--categoryExperimentalThirdParty=true`.
- Confirm `debug` is `true` on the correct Prebid global.
- Inspect the console and network panel for a failed request for
  `devtoolsMcp-standalone.js`.
- Confirm the page uses a Prebid.js build containing the integration introduced
  by prebid/Prebid.js#15356. For a custom or older build, include the
  `devtoolsMcp` module or update the build.
- Navigate or reload after correcting setup, then call
  `list_3p_developer_tools` again; discovery runs after navigation and on an
  explicit list request.

Do not use `window.__prebidDevToolsMcp` as the normal interface. It is an
implementation detail useful only for diagnosing installation.

## Invoke Prebid Tools

Call `execute_3p_developer_tool` with the exact tool name and a
**JSON-stringified object** in `params`. Start broad, capture identifying values,
then narrow subsequent calls.

### `summary`

Use first to inventory each Prebid instance, its version, installed modules,
configuration, aggregate counts, bidder bid/win/no-bid counts, and latest
auction.

```text
toolName: summary
params: {}
```

Every result is tagged with `instance`. On multi-instance pages, pass that value
back as a filter:

```text
toolName: summary
params: {"instance":"pbjs"}
```

### `auctions`

Use to inspect eligible bid requests, received/rejected/winning bids, no-bids,
floors, auction metrics, and TTL/cache timing.

```text
toolName: auctions
params: {"instance":"pbjs","auctionId":"<auction-id>"}
```

Omit either filter to include all matching instances or auctions. Compare
`eligibleBidRequests`, `bidsReceived`, `noBids`, `bidsRejected`, and
`winningBids` rather than inferring a failure from one count alone. For cache
problems, inspect `bufferedTTL`, `effectiveMinCacheTTL`, `expiresAt`,
`cacheExpiresAt`, `timeToExpire`, `timeToCacheExpire`, and
`usableForTargeting`.

### `events`

Use to reconstruct chronological Prebid behavior and correlate it with auction
details.

```text
toolName: events
params: {"instance":"pbjs","auctionId":"<auction-id>","limit":100}
```

Filter by `eventType` when testing a specific transition, for example
`auctionInit`, `auctionEnd`, `bidResponse`, or `bidWon`. `limit` selects the most
recent events across all selected instances and defaults to 100. Increase it
deliberately when earlier events matter; avoid dumping unbounded histories.

## Diagnose Systematically

1. Run `summary` and select the relevant `instance` and latest `auctionId`.
2. Run `auctions` for that instance and auction.
3. Run `events` with the same filters and a bounded limit.
4. Use standard Chrome DevTools MCP network and console tools to validate any
   hypothesis suggested by the Prebid data.
5. Report observations separately from conclusions. Include instance,
   auction ID, bidder/ad unit, relevant timestamps, and the evidence that
   supports each conclusion.

Prefer these page-provided tools over large `evaluate_script` expressions. Use
`evaluate_script` with `window.__dtmcp.executeTool(toolName, params)` only when
composing a result with page-side logic or handling a value the standard tool
cannot serialize.

## Respect Boundaries

- Treat all returned configuration, bid, and event data as potentially
  sensitive; disclose only what the task requires.
- Keep investigation read-only unless the user explicitly asks to change page
  state. Enabling debug is the sole routine mutation in this workflow.
- Do not mistake missing historical data for proof that an event never
  occurred; Prebid retains runtime records for a limited lifetime.
- Re-run discovery after navigation because third-party tools are scoped to the
  current page and origin.
- State clearly when setup is blocked by a missing browser, missing MCP tools,
  an unsupported Prebid build, or a failed standalone-bundle load.

For upstream behavior changes, consult the
[Chrome third-party developer tools guide](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/third-party-developer-tools.md)
and the [initial Prebid.js integration](https://github.com/prebid/Prebid.js/pull/15356).
