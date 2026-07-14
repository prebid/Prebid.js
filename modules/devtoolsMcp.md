# Prebid DevTools MCP Module

The `devtoolsMcp` module exposes runtime Prebid.js diagnostics to Chrome DevTools MCP third-party developer tools. Include this module in a Prebid.js build when you want MCP clients to inspect auctions, bid request eligibility, TTL/cache expiry data, floors, bidder summaries, and event timing directly from the page.

## Usage

Build Prebid.js with the module included, then load that build on a page:

```sh
gulp build --modules=devtoolsMcp
```

When the build runs in the browser, the module listens for Chrome's `devtoolstooldiscovery` event and responds with a `ToolGroup` named `Prebid.js DevTools`. Tool names are prefixed with the Prebid global name, for example `pbjs_prebid_summary`, so pages with more than one Prebid global do not register ambiguous tool identifiers.

## Tools

### `<global>_prebid_summary`

Returns a runtime summary containing:

- Prebid version and installed module names.
- Current Prebid config snapshot.
- Bid cache TTL settings.
- Aggregate counts for auctions, events, ad units, bid requests, bids received, no-bids, and winning bids.
- Bidder-level bid, no-bid, and winning-bid counts.
- The latest auction snapshot.

Input schema: an empty object.

### `<global>_prebid_auctions`

Returns auction snapshots. Pass `auctionId` to filter to one auction, or omit it to return all tracked auctions.

Each auction snapshot includes:

- Auction status, start/end timestamps, timeout, duration, labels, and ad unit codes.
- Eligible bid requests with bidder request IDs, bidder codes, media types, sizes, floor data, and `ortb2Imp` data.
- Received bids with CPM, currency, media type, TTL, buffered TTL, effective cache TTL, expiry timestamps, floor data, targeting usability, deal ID, rejection reason, and metrics.
- No-bids, rejected bids, winning bids, seat non-bids, and auction metrics.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "auctionId": {"type": "string"}
  },
  "additionalProperties": false
}
```

### `<global>_prebid_events`

Returns Prebid event history with event type, event id, elapsed time, sequence number, and sanitized event args. A `limit` of `0` returns an empty list; positive values are floored to an integer before slicing history.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "auctionId": {"type": "string"},
    "eventType": {"type": "string"},
    "limit": {"type": "number", "default": 100, "minimum": 0}
  },
  "additionalProperties": false
}
```

## Notes

- The module is optional and only registers tools when included in the build.
- The registration guard is keyed by the Prebid global name so pages with multiple Prebid globals can expose tools for each global.
- Tool results are sanitized before being returned so function values and non-serializable objects do not break tool execution.
