# Prebid DevTools MCP Module

The `devtoolsMcp` module exposes runtime Prebid.js diagnostics to Chrome DevTools MCP third-party developer tools. Include this module in a Prebid.js build when you want MCP clients to inspect auctions, bid request eligibility, TTL/cache expiry data, floors, bidder summaries, and event timing directly from the page.

## Usage

Build Prebid.js with the module included, then load that build on a page:

```sh
gulp build --modules=devtoolsMcp
```

When the build runs in the browser, the module listens for Chrome's `devtoolstooldiscovery` event and responds with a `ToolGroup` named `Prebid.js DevTools`. A single, un-namespaced set of tools (`summary`, `auctions`, `events`) is registered regardless of how many Prebid instances are present on the page or how they are named; the first instance to load `devtoolsMcp` installs the listener, and every instance registers itself so the tools aggregate results across all of them.

Every result row carries an `instance` field identifying the Prebid instance it came from. The instance id is the Prebid global variable name when the build defines a global, or a synthetic `unnamed-<n>` otherwise. All three tools accept an optional `instance` parameter to restrict results to a single instance.

## Tools

### `summary`

Returns a list with one runtime summary per Prebid instance on the page (or just the instance named by `instance`). Each summary is tagged with its `instance` and contains:

- Prebid version and installed module names.
- Current Prebid config snapshot.
- Bid cache TTL settings.
- Aggregate counts for auctions, events, ad units, bid requests, bids received, no-bids, and winning bids.
- Bidder-level bid, no-bid, and winning-bid counts.
- The latest auction snapshot.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "instance": {"type": "string"}
  },
  "additionalProperties": false
}
```

### `auctions`

Returns a flattened list of auction snapshots across all Prebid instances. Pass `auctionId` to filter to one auction, or `instance` to restrict to a single Prebid instance; omit both to return everything tracked.

Each auction snapshot is tagged with its `instance` and includes:

- Auction status, start/end timestamps, timeout, duration, labels, and ad unit codes.
- Eligible bid requests with bidder request IDs, bidder codes, media types, sizes, floor data, and `ortb2Imp` data.
- Received bids with CPM, currency, media type, TTL, buffered TTL, effective cache TTL, expiry timestamps, floor data, targeting usability, deal ID, rejection reason, and metrics.
- No-bids, rejected bids, winning bids, seat non-bids, and auction metrics.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "instance": {"type": "string"},
    "auctionId": {"type": "string"}
  },
  "additionalProperties": false
}
```

### `events`

Returns the Prebid event history across all instances, flattened and ordered chronologically by `elapsedTime`, with each row tagged with its `instance` and carrying event type, event id, elapsed time, sequence number, and sanitized event args. Pass `instance` to restrict to a single Prebid instance. The `limit` selects the most recent records across the combined history rather than applying to each instance: a `limit` of `0` returns an empty list; positive values are floored to an integer.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "instance": {"type": "string"},
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
