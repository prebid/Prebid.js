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

Previous auction info can help a bidder lower its bids, so the publisher's configuration decides who receives it. Prebid Server can only narrow that set, never widen it:

- With a `bidders` list, exactly those bidders are recorded, whether or not Prebid Server flags them. A flagged bidder that is not listed gets nothing.
- Without a `bidders` list, client-side bidders are all recorded. A Prebid Server bidder is recorded only once Prebid Server has flagged one of its bids, and from then on for the rest of the page view.
- The flag never turns the module on. If `enabled` is not `true`, the flag is ignored.

For stored impressions, which are requested without a bidder, the flag and the recorded info belong to the seat that responded. The info reaches Prebid Server in `ext.prebid.bidderconfig`, like any other bidder-specific first party data.
