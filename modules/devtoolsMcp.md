# Prebid DevTools MCP Module

Runtime Prebid.js diagnostics exposed as Chrome DevTools third-party developer tools. It lets an agent driving Chrome (for example via [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)) inspect a page's live Prebid state — auctions, bid eligibility, TTL/cache expiry, floors, event timing, installed modules, and configuration — by asking in natural language.

## Quick start (through an agent)

You usually don't have to build or install anything. Point your agent's Chrome DevTools session at a page that runs Prebid, and Prebid pulls in these tools on demand when both of the following hold:

- **Debugging is on** — the page URL has `?pbjs_debug=true`, or the page calls `pbjs.setConfig({ debug: true })`.
- **The browser is automated** — `navigator.webdriver` is `true`, which is the case for an agent-controlled Chrome.

The Chrome DevTools MCP server must also have third-party developer tools enabled (start it with `--categoryExperimentalThirdParty=true`). Once loaded, the tools appear under a group named **Prebid.js DevTools**, and the agent can discover and call them.

### Example prompts

Assuming your agent is connected to Chrome DevTools on the target page:

- "Use the Prebid DevTools tools to summarize the Prebid setup on this page."
- "Which bidders won the last auction, and at what CPM?"
- "Show the eligible bid requests and any no-bids for the most recent auction."
- "Were any bids rejected? If so, why?"
- "List the Prebid events for auction `<auctionId>`, in order."
- "When does the top bid for `div-1` expire from the bid cache?"
- "Which Prebid modules are installed, and what does the current config look like?"
- "This page has two Prebid instances — compare their winning bids." (every result is tagged with the instance it came from)

The agent maps these to the three tools below and fills in parameters as needed. If the agent reports it can't find any Prebid tools, re-check the two conditions above (debug on, automated browser) and that the MCP server was started with `--categoryExperimentalThirdParty=true`.

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

When compiled in, it registers the tools as soon as Prebid loads, without the debug/automation conditions.

## Notes

- Tool results are sanitized before being returned, so function values and non-serializable objects do not break tool execution.
- The tools are read-only: they report on Prebid state and never modify it.
