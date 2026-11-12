# Overview

```txt
Module Name: Generic Analytics Skinny Events
Module Type: Generic Analytics Adapter preset
Maintainer:  prebid@prebid.org
```

#### About

The [generic analytics adapter](https://docs.prebid.org/dev-docs/modules/genericAnalyticsAdapter.html)
collects full Prebid event payloads by default. These contain a lot of data that is rarely needed for analytics
(full EIDs, first party data repeated on every bid request, consent strings, creative markup and so on).

This module provides the `skinny` preset, which reduces payloads to the fields that are typically useful,
and collects only the following events:

| Event | Fields |
|-------|--------|
| `bidRequested` | `auctionId`, `bidderRequestId`, `bidderCode`, `auctionStart`, `start`, `timeout`, `ortb2` (without EIDs), `eidsSources`, `bids` (see below) |
| `bidResponse` | `auctionId`, `adUnitCode`, `transactionId`, `requestId`, `adId`, `bidder`, `bidderCode`, `cpm`, `currency`, `originalCpm`, `originalCurrency`, `mediaType`, `width`, `height`, `size`, `dealId`, `meta`, `adserverTargeting`, `floorData`, `requestTimestamp`, `responseTimestamp`, `timeToRespond`, `ttl`, `source` |
| `bidWon` | same as `bidResponse`, plus `status` |
| `bidClick` | `auctionId`, `adUnitCode`, `transactionId`, `requestId`, `adId`, `bidder`, `bidderCode`, `cpm`, `currency`, `mediaType`, `source`, `method` (`creativeClick` or `nativeClick`), and optional native `assetId` |
| `bidClickInferred` | same click correlation fields, `method: iframeFocus`; no full bid or creative markup |
| `noBid` | `auctionId`, `bidId`, `bidderRequestId`, `adUnitCode`, `bidder`, `source` |
| `bidTimeout` | `bidderRequests`: the timed out bids grouped by bidder request, each with `auctionId`, `bidderRequestId`, `bidderCode`, `ortb2` (without EIDs), `eidsSources` and `bids` (see below) |

Bid requests (in `bidRequested` and `bidTimeout`) contain `bidId`, `bidderRequestId`, `auctionId`, `adUnitCode`,
`transactionId`, `bidder`, `source`, `mediaTypes`, `sizes`, `auctionsCount`, `bidRequestsCount`,
`bidderRequestsCount`, `bidderWinsCount` and `ortb2Imp`.

Instead of EIDs, `eidsSources` lists which ID sources were present (for example `['pubcid.org', 'id5-sync.com']`).

Every payload also includes `eventType` (the name of the event) and `analyticsLabels`, if any are configured.

The click events are emitted when `bidClickTracking` is enabled (`bidClickInferred` also needs the `bidClickTracking` module). Both preserve only lightweight bid correlation fields; the full bid, creative markup, and the ad-server click URL are omitted. The inferred click event is deliberately distinct from observed clicks.

#### Public payload contract

The built-in preset emits seven JSON event shapes. Their contract is published alongside this module:

- JSON Schema, `prebid.js/schema/genericAnalyticsSkinnyEvents.schema.json` in the NPM package, for collectors
  and other non-TypeScript consumers. It is generated from the TypeScript types by `gulp build`.
- TypeScript exports `SkinnyEventPayload` (a discriminated union),
  `SkinnyEventPayloads` (event-name-to-payload mapping), and `SkinnyEventType`,
  plus the per-event types from `genericAnalyticsSkinnyEvents.ts`.

The schema applies to **serialized payloads produced by the built-in `skinny` preset**,
not to the full Prebid event arguments, or to data produced by custom `options.events`
formatters. Every event has `eventType` as its discriminator. Fields whose values
are `undefined` may be omitted during JSON serialization; JSON Schema accordingly
does not require them. `analyticsLabels`, when present, is an object. Nested OpenRTB
objects (`ortb2`, `ortb2Imp`) and extensible metadata may contain additional fields.
The schema describes **one event**. With the default `batchSize: 1`, the generic
adapter sends that single object; with `batchSize` greater than 1 it sends a JSON
array of events (each matching the schema), and with `method: 'GET'` the JSON is
passed in the `data` query parameter. A zero-CPM, non-deal `bidResponse` has no
`size`, because Prebid sets it only when computing targeting keys.
`bidRequested` and `bidTimeout` keep global `ortb2` at bidder-request level,
and `ortb2Imp` at individual bid-request level. For stored-impression requests
sent to Prebid Server, the bidder request's `bidderCode` and individual bids'
`bidder` may be `null` rather than a bidder name.
`bidClick` and `bidClickInferred` share one set of click correlation fields
and differ in `method`: `bidClick` is only
`creativeClick` or `nativeClick`, and `bidClickInferred` is only `iframeFocus`.
`assetId` (a number or string) is present only when a native click reported one.

Nested OpenRTB objects (`ortb2`, `ortb2Imp`) are described by separate schemas, `schema/ortb2/request.schema.json`
and `schema/ortb2/imp.schema.json`, which the event schema references with `$ref`. They validate the fields
OpenRTB 2.6 declares and accept any other field. To skip OpenRTB validation, register a permissive schema
under their `$id` instead, e.g. with Ajv:

```javascript
[requestSchema, impSchema].forEach(({ $id }) => ajv.addSchema({ $id }));
```

Their `$id` can be older than the event schema's (see versioning below), so take it from the ORTB schemas, or from the
event schema's `$ref`s resolved against its `$id`. `ortb2` and `ortb2Imp` must still be objects.
The schemas use union types (`"type": ["string", "number"]`), which Ajv's strict mode rejects unless `allowUnionTypes` is set.

The wire contract is regression-tested by two existing CI suites: browser tests
compare the seven formatter outputs after `JSON.stringify`/`JSON.parse` with
`test/fixtures/genericAnalyticsSkinnyEvents.json`, and the Node build-logic
tests validate those same fixtures against the generated JSON Schema using Ajv 2020.
This catches output changes independently of schema edits and rejects
unknown event types or fields with incorrect types.

**Versioning:** the schema's `$id` is its version. It is the schema's URL in the release that introduced it
(e.g. `https://cdn.jsdelivr.net/npm/prebid.js@11.50.0/dist/schema/genericAnalyticsSkinnyEvents.schema.json`),
and a release that does not change what the schema accepts publishes the previous release's schema unchanged, `$id`
included. Collectors can therefore pin an `$id` and treat a different one as a contract change. Events do not carry a
`schemaVersion` field. Each event sets `additionalProperties: false`, so adding a field is a contract change too:
collectors that validate against the previous schema reject a payload with an added top-level field. This contract
does not imply a common schema for all Prebid.js analytics events or Prebid Server.

#### Build

```bash
gulp build --modules=genericAnalyticsSkinnyEvents,...
```

Including this module also includes the generic analytics adapter.

#### Configuration

```javascript
pbjs.enableAnalytics({
  provider: 'generic',
  options: {
    url: 'https://example.com/analytics',
    preset: 'skinny'
  }
});
```

Functions in `options.events` take precedence over the preset for the same event, and can add events the preset
does not collect:

```javascript
pbjs.enableAnalytics({
  provider: 'generic',
  options: {
    url: 'https://example.com/analytics',
    preset: 'skinny',
    events: {
      // replaces the preset's bidWon
      bidWon(bid) {
        return { eventType: 'bidWon', adId: bid.adId, cpm: bid.cpm };
      },
      // not in the preset
      auctionEnd(auction) {
        return { eventType: 'auctionEnd', auctionId: auction.auctionId };
      }
    }
  }
});
```

If `preset: 'skinny'` is set but this module is not included in the build, the generic analytics adapter logs an
error and is not enabled.
