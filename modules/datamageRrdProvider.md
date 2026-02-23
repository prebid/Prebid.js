# DataMage RTD Submodule

DataMage provides real-time contextual classification (IAB Categories, Sentiment, Brands, Locations, Public Figures, Restricted Categories, and related IDs) that can be used to enrich demand signals and Google Ad Manager targeting.

## What it does

DataMage automatically supports two outcomes in a Prebid + GAM setup without requiring any custom glue-code on the page:

1) **Passes data to Google Ad Manager (Direct GPT targeting)**
- The moment Prebid initializes, DataMage fetches classification for the current page and automatically pushes the targeting keys directly to GPT via `googletag.pubads().setTargeting(...)` at the page level. 
- This ensures the data is available for all ad slots and works **even if there are no bids** or if the auction times out.

2) **Passes data to bidders (ORTB2 enrichment)**
- Using a memoized cache from the initial fetch, DataMage seamlessly inserts the contextual results into the bid request using OpenRTB (`ortb2Fragments.global.site.content.data`), allowing bidders to receive the enriched signals instantly.

## Keys provided

DataMage automatically maps and provides the following targeting keys (when available in the API response):

- `om_iab_cat_ids`
- `om_iab_cats`
- `om_brand_ids`
- `om_sentiment_ids`
- `om_location_ids`
- `om_public_figure_ids`
- `om_restricted_cat_ids`
- `om_restricted_cats`
- `om_ops_mage_data_id`
- `om_res_score_bucket`
- `om_res_score` (only when present)



##Prebid config
```
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 500, // Gives the module time to fetch data before bids are sent
    dataProviders: [{
      name: "datamage",
      params: {
        api_key: "YOUR_API_KEY",
        selector: "article",
        fetch_timeout_ms: 2500
      }
    }]
  }
});
```

##GAM set up requirements

Because DataMage now automatically injects targeting globally into pubads(), your page implementation only requires a standard Prebid setup.

To ensure DataMage key-values are included in your GAM requests:

Call googletag.pubads().disableInitialLoad() before your ad requests.

Define your slots and call googletag.enableServices().

Run pbjs.requestBids(...).

Inside the bidsBackHandler callback:

Call pbjs.setTargetingForGPTAsync() (to set standard Prebid hb_ pricing keys).

Call googletag.pubads().refresh() to trigger the GAM request.

GAM will automatically combine the standard Prebid slot-level pricing keys with the page-level DataMage contextual keys.

Note that you will need a _real_ api key provisioned by data mage to use this module in production.

Example:
```pbjs.requestBids({
    bidsBackHandler: function () {
        // Push standard header bidding keys to GPT
        pbjs.setTargetingForGPTAsync();

        // Refresh the ad slots. Datamage keys are already injected!
        googletag.cmd.push(function () {
            googletag.pubads().refresh();
        });
    },
    timeout: 1500
});
```