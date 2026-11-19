# Overview

Module Name: Previous Auction Info
Module Type: General Module

# Description

Collects the results of each auction for selected bidders and sends them to those bidders in their next request, in `ortb2.ext.prebid.previousauctioninfo`. The module does nothing unless the publisher enables it.

Full documentation: https://docs.prebid.org/dev-docs/modules/previousAuctionInfo.html

# Configuration

```javascript
pbjs.setConfig({
  previousAuctionInfo: {
    enabled: true,                          // required
    bidders: ['bidderCode1', 'bidderCode2'], // optional; omit to enable all bidders
    maxQueueLength: 10                      // optional; payloads kept per bidder, default 10
  }
});
```

# Prebid Server bidders

A Prebid Server host can turn on `requestPreviousAuctionInfo` for a bidder. Prebid Server then marks that bidder's bids with `seatbid[].bid[].ext.prebid.relaypreviousauctioninfo: true`, which the Prebid Server Bid Adapter exposes as `bid.relayPreviousAuctionInfo`.

When the module is enabled, a bidder whose bid carried the flag is treated as if it were listed in `bidders` for the rest of the page view. Its info reaches Prebid Server in `ext.prebid.bidderconfig`, like any other bidder-specific first party data.

The flag does not turn the module on: with `enabled` not set to `true`, it is ignored. When `bidders` is omitted every bidder is already enabled, so the flag changes nothing.
