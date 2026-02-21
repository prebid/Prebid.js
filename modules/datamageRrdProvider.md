# DataMage RTD Submodule

DataMage provides contextual classification (IAB Categories, Sentiment, Brands, Locations, Public Figures, Restricted Categories, and related IDs) that can be used to enrich demand signals and Google Ad Manager targeting.

## What it does

DataMage supports two outcomes in a Prebid + GAM setup:

1) **Passes data to bidders (ORTB2 enrichment)**
- DataMage fetches classification for the current page/content.
- The results are inserted into the bid request using OpenRTB (ORTB2), so bidders can receive the contextual signal.

2) **Passes data to Google Ad Manager (direct GPT targeting)**
- DataMage publishes a targeting map on the page (`window.__DATAMAGE_GPT_TARGETING__`) and emits an event (`datamage:gptTargeting`).
- Your page then sets those key-values into GPT/GAM using `googletag.pubads().setTargeting(...)`.
- This works **even if there are no bids**, as long as GPT is refreshed after targeting is set.

## Keys provided

DataMage can provide the following keys (when available):

- `om_iab_cat_ids`, `om_iab_cats`
- `om_brand_ids`, `om_brands`
- `om_sentiment_ids`, `om_sentiment`
- `om_location_ids`, `om_locations`
- `om_public_figure_ids`, `om_public_figures`
- `om_restricted_cat_ids`, `om_restricted_cats`
- `om_ops_mage_data_id`
- `om_res_score_bucket`
- `om_res_score` (only when present)

> Publisher domain keys are not used.

## Integration

### 1) Build Prebid.js with DataMage
Include the module in your Prebid build:
```bash
gulp build --modules=datamageRtdProvider,...
```

### 2) Enable the RTD provider in Prebid config
Example:
```js
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 500,
    dataProviders: [{
      name: "datamage",
      params: {
        api_key: "YOUR_API_KEY",
        selector: "article",
        auction_timeout_ms: 0,
        fetch_timeout_ms: 2500
      }
    }]
  }
});
```

### 3) GAM (GPT) setup requirements
To ensure DataMage key-values are included in the GAM request:

1. Call `googletag.pubads().disableInitialLoad()` before the ad request.
2. Define the slot and keep a reference to it.
3. Call `googletag.display()` once (no request yet because initial load is disabled).
4. Run `pbjs.requestBids(...)`.
5. After bids return:
   - Call `pbjs.setTargetingForGPTAsync()` (for hb_* keys when bids exist).
   - Wait for DataMage targeting (`window.__DATAMAGE_GPT_TARGETING__` or the `datamage:gptTargeting` event).
   - Apply DataMage targeting via `googletag.pubads().setTargeting(...)`.
6. Call `googletag.pubads().refresh([slot])` to make the GAM request.

This sequence ensures:
- DataMage targeting reaches GAM
- ORTB2 enrichment reaches bidders
- DataMage targeting can still be applied even if there are no bids

Note: Datamage api URLs will cache for 5 minutes, so you may not see content return until the cache has cleared.