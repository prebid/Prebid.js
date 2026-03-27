## Summary

Adds `minTargetedBidCacheTTL` config option to prevent bids that have had targeting set from expiring, fixing "cannot find ad" / expired render errors when using GPT lazy load with scroll-based render.

## Problem

Setting `minBidCacheTTL` causes "cannot find ad" errors in lazy-load scenarios. The ad is fetched from GPT, but the scroll milestone for render takes a long time. Winning bids expire and are dropped from memory before GPT can render them.

## Solution

- **`minTargetedBidCacheTTL`** – When set, overrides `minBidCacheTTL` for bids that have had targeting set (bids sent to the ad server).
- If unset, behavior is unchanged (all bids use `minBidCacheTTL`).
- Set to `Infinity` (or a large value) to effectively never expire winning bids.

## Usage

```javascript
pbjs.setConfig({
  minBidCacheTTL: 30,
  minTargetedBidCacheTTL: Infinity  // keep targeted bids indefinitely for lazy-load GPT
});
```

## Changes

- **src/bidTTL.ts** – Added `minTargetedBidCacheTTL` config, `getMinTargetedBidCacheTTL()`, and `getEffectiveMinBidCacheTTL(bid)`
- **src/auction.ts** – Use effective TTL per bid; refresh bid TTL when targeting is set
- **src/auctionManager.js** – Use effective TTL when calculating auction TTL

## Testing

- `gulp lint` – passed
- `gulp test --file test/spec/auctionmanager_spec.js` – 91 tests passed

## Labels

`feature` | `minor`

---

Fixes #12987
