# Overview

Module Name: Holid Bid Adapter
Module Type: Bidder Adapter
Maintainer: richard@holid.se

# Description

Banner adapter for Holid's Prebid Server endpoint. Each ad unit produces one request,
retaining its request-level and impression-level stored-request ID. Requests with
potentially different server-side configurations are not batched together.

The adapter uses Prebid's ORTB converter. It forwards bidder-filtered `ortb2` and
`ortb2Imp` data, including GPID and PMP context, and passes consent signals and EIDs
provided by Prebid. Forwarding these fields does not guarantee that every downstream
bidder supports them or that a publisher integration meets all privacy requirements.

The highest CPM response per impression is returned, with its own deal ID, expiry,
advertiser metadata and Holid win-event URL. Response `exp` supplies TTL in seconds;
300 seconds is the fallback when it is absent. Invalid/expired banner bids are ignored.

## Parameters

- `adUnitID` (required): non-empty string or positive integer stored-request ID.
- `tmax` (optional): positive millisecond timeout, capped by Prebid's auction timeout.
- `floor` (optional): non-negative numeric legacy CPM floor.
- `floorCurrency` (optional): currency of that legacy floor; defaults to `USD`.

Include the `priceFloors` module to use its standard ORTB floor processor. A resolved
floor or explicit `ortb2Imp.bidfloor` takes precedence over the legacy parameter.
Floor signaling alone does not guarantee server-side or downstream enforcement.

## User sync

An iframe sync is returned only when Prebid permits iframe syncing and the auction
response identifies bidders. There is no HTML-as-image fallback or unconditional
Adform tracker. Image-only publisher configurations do not sync through this adapter.

The companion Holid sync bridge must accept `us_privacy` (legacy alias `usp_consent`),
`gpp` and JSON-array `gpp_sid` query parameters. It translates the latter to the
comma-separated `/cookie_sync` representation. The bridge is hosted and deployed separately by Holid. The browser adapter alone
cannot repair a separately hosted, outdated bridge.

## Sample Banner Ad Unit

```js
var adUnits = [{
  code: 'bannerAdUnit',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  bids: [{ bidder: 'holid', params: { adUnitID: '12345', floor: 0.5 } }]
}];
```
