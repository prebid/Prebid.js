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
| `noBid` | `auctionId`, `bidId`, `bidderRequestId`, `adUnitCode`, `bidder`, `source` |
| `bidTimeout` | `bidderRequests`: the timed out bids grouped by bidder request, each with `auctionId`, `bidderRequestId`, `bidderCode`, `ortb2` (without EIDs), `eidsSources` and `bids` (see below) |

Bid requests (in `bidRequested` and `bidTimeout`) contain `bidId`, `bidderRequestId`, `auctionId`, `adUnitCode`,
`transactionId`, `bidder`, `source`, `mediaTypes`, `sizes`, `auctionsCount`, `bidRequestsCount`,
`bidderRequestsCount`, `bidderWinsCount` and `ortb2Imp`.

Instead of EIDs, `eidsSources` lists which ID sources were present (for example `['pubcid.org', 'id5-sync.com']`).

Every payload also includes `eventType` (the name of the event) and `analyticsLabels`, if any are configured.



#### Public payload contract (v1)

The built-in preset emits five JSON event shapes. Their versioned contract is published alongside this module:

- [JSON Schema v1](genericAnalyticsSkinnyEvents.v1.schema.json) for collectors and other non-TypeScript consumers.
- TypeScript exports `SkinnyEventPayload` (a discriminated union),
  `SkinnyEventPayloads` (event-name-to-payload mapping), and `SkinnyEventType`,
  plus the per-event types from `genericAnalyticsSkinnyEvents.ts`.

The schema applies to **serialized payloads produced by the built-in `skinny` preset**,
not to the full Prebid event arguments, or to data produced by custom `options.events`
formatters. Every event has `eventType` as its discriminator. Fields whose values
are `undefined` may be omitted during JSON serialization; JSON Schema accordingly
does not require them. `analyticsLabels`, when present, is an object. Nested OpenRTB
objects (`ortb2`, `ortb2Imp`) and extensible metadata may contain additional fields.
`bidRequested` and `bidTimeout` keep global `ortb2` at bidder-request level,
and `ortb2Imp` at individual bid-request level.

**Versioning policy:** v1 describes existing output; it is not a request to add a
`schemaVersion` field to events. Schema versions are selected out-of-band by
collectors. Incompatible changes to the preset's serialized shape should publish
a new schema version rather than silently rewriting v1. Additive fields can be
introduced without invalidating v1 consumers, provided the relevant versioned
schema is updated and those consumers tolerate the added fields. This contract
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
