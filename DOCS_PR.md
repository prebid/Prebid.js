# Docs PR: minTargetedBidCacheTTL

**Target:** Prebid publisher docs – add to the [setConfig](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html) page, after the existing **Minimum bid cache TTL** section.

---

## Section to add (after "Minimum bid cache TTL")

### Minimum cache TTL for targeted bids

When using `minBidCacheTTL` to limit how long bids stay in memory, bids that have already been sent to the ad server (targeting set) can expire before the ad is rendered. That often happens with GPT lazy load or other delayed render: the ad is requested and targeting is set, but the slot only renders when the user scrolls. If the bid is dropped from cache before render, you get "cannot find ad" or similar errors.

Use **`minTargetedBidCacheTTL`** to give those bids a longer (or unlimited) cache time than other bids:

```javascript
pbjs.setConfig({
  minBidCacheTTL: 30,             // drop non-targeted bids after 30s
  minTargetedBidCacheTTL: Infinity  // keep targeted bids until page unload (lazy-load / long-delay render)
});
```

- When set, it overrides `minBidCacheTTL` only for bids that have had **targeting set** (e.g. sent to GPT via `setTargetingForGPT`).
- When unset, all bids use `minBidCacheTTL` (current behavior).
- Use a number (seconds) for a longer but finite TTL, or `Infinity` to keep targeted bids for the life of the page.

**Publisher choices when using bid cache TTL**

If you use `minBidCacheTTL` (with or without `minTargetedBidCacheTTL`), you are making a tradeoff between memory and ad availability. Be explicit about what should happen when:

1. **A bid expires after targeting but before render**
   - Rely on `minTargetedBidCacheTTL` so targeted bids stay in cache until render, or
   - Accept that the slot may show no ad / blank, or
   - Run a new auction when the slot is about to render (e.g. in a lazy-load callback).

2. **Bids are dropped for memory saving**
   - Decide whether you prefer lower memory (shorter TTL) or fewer "missing ad" cases (longer TTL or `minTargetedBidCacheTTL`).

**SSP / revenue note**

Bids have a TTL from the bidder/SSP. If an ad is rendered **after** that TTL, the SSP may treat the bid as expired and not attribute revenue. Keeping bids in Prebid's cache longer (e.g. with `minTargetedBidCacheTTL`) does not change the SSP's own TTL. Use this setting when the delay is on your side (e.g. lazy load), not to extend the SSP's idea of when the bid is valid.

---

## Link from Prebid.js PR

In your Prebid.js PR description, add:

**Docs:** [PR link to prebid.github.io or docs repo once opened]
