# Prebid DevTools MCP Module

Runtime Prebid.js diagnostics exposed as Chrome DevTools third-party developer tools. It lets an agent driving Chrome (for example via [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)) inspect a page's live Prebid state — auctions, bid eligibility, TTL/cache expiry, floors, event timing, installed modules, and configuration — by asking in natural language.

## Quick start (through an agent)

You usually don't have to build or install anything. Point your agent's Chrome DevTools session at a page that runs Prebid, and Prebid pulls in these tools on demand whenever debugging is on — the page URL has `?pbjs_debug=true`, or the page calls `pbjs.setConfig({ debug: true })`.

Once loaded, the tools appear under a group named **Prebid.js DevTools**, and the agent can discover and call them.

> **Chrome third-party developer tools are still experimental.** Two things are needed today, and both are expected to become unnecessary once the feature is generally available:
>
> 1. **Start the Chrome DevTools MCP server with `--categoryExperimentalThirdParty=true`.** Without it, the server neither injects the page bridge nor exposes the `list_3p_developer_tools` / `execute_3p_developer_tool` tools, so page-provided tools are invisible.
> 2. **Tell your agent the feature exists.** Because it is experimental, an agent generally will not look for page-provided tools on its own — point it at the [Chrome DevTools third-party developer tools guide](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/third-party-developer-tools.md) (for example, include the link in your prompt) so it knows to call `list_3p_developer_tools` and `execute_3p_developer_tool`.

### Example prompts

Assuming your agent is connected to Chrome DevTools on the target page. While the feature is experimental, first make sure the agent knows to look for page-provided tools — for example:

- "This page exposes Chrome DevTools third-party developer tools (see https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/third-party-developer-tools.md). List them and use the Prebid ones to summarize the Prebid setup on this page."

Then ask questions like:

- "Which bidders won the last auction, and at what CPM?"
- "Show the eligible bid requests and any no-bids for the most recent auction."
- "Were any bids rejected? If so, why?"
- "List the Prebid events for auction `<auctionId>`, in order."
- "When does the top bid for `div-1` expire from the bid cache?"
- "Which Prebid modules are installed, and what does the current config look like?"
- "This page has two Prebid instances — compare their winning bids." (every result is tagged with the instance it came from)

The agent maps these to the three tools below and fills in parameters as needed. If the agent reports it can't find any Prebid tools: (1) confirm debugging is on; (2) confirm the MCP server was started with `--categoryExperimentalThirdParty=true`; and (3) point the agent at the [third-party developer tools guide](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/third-party-developer-tools.md) so it knows to call `list_3p_developer_tools` / `execute_3p_developer_tool` — an agent unaware of the experimental feature will not look for page-provided tools on its own.

## The tools

All three return results tagged with an `instance` field, and all accept an optional `instance` parameter to restrict output to a single Prebid instance (see [Multiple Prebid instances](#multiple-prebid-instances)).

- **`summary`** — one high-level summary per Prebid instance: version, installed modules, the current config snapshot, counts (auctions, events, ad units, bid requests, bids received, no-bids, winning bids), per-bidder bid/no-bid/win counts, and the latest auction. No parameters (besides `instance`).
- **`auctions`** — auction-level detail: status/timing, ad unit codes, eligible bid requests, received bids (with CPM, currency, media type, TTL/buffered TTL, cache-expiry timestamps, floors, targeting usability, deal id, rejection reason, metrics), no-bids, rejected bids, winning bids, and seat non-bids. Optional `auctionId` narrows to one auction.
- **`events`** — the Prebid event history, ordered chronologically by `elapsedTime`, with event type, id, elapsed time, sequence, and sanitized args. Optional `auctionId` / `eventType` filter, and `limit` (default 100, `0` for none) selects the most recent records across the combined history.

## Multiple Prebid instances

A single set of tools is registered no matter how many Prebid instances are on the page, or what they are named. Every result row carries an `instance` field — the Prebid global variable name, or a synthetic `unnamed-<n>` when the build defines no global — and results aggregate across all instances unless you pass an `instance` filter.

## Including it in a build (optional)

The on-demand path above does not require the module to be part of the page's Prebid build. If you prefer to ship it, build Prebid with the module included:

```sh
gulp build --modules=devtoolsMcp
```

When compiled in, it registers the tools as soon as Prebid loads, regardless of the debug setting.

## Notes

- Tool results are sanitized before being returned, so function values and non-serializable objects do not break tool execution.
- The tools are read-only: they report on Prebid state and never modify it.
