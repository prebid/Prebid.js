## GrowthCode Analytics Adapter

[GrowthCode](https://growthcode.io) offers scaled infrastructure-as-a-service to 
empower independent publishers to harness data and take control of identity and 
audience while rapidly aligning to industry changes and margin pressure.

## Building Prebid with GrowthCode Support

First, make sure to add the GrowthCode submodule to your Prebid.js package with:

```
gulp build --modules=growthCodeIdSystem,growthCodeAnalyticsAdapter,userId
```

The following configuration parameters are available:

```javascript
pbjs.enableAnalytics({
  provider: 'growthCodeAnalytics',
  options: {
    pid: '<Contact GrowthCode>',
    trackEvents: [
      'auctionEnd',
      'bidAdjustment',
      'bidTimeout',
      'bidRequested',
      'bidResponse',
      'noBid',
      'bidWon',
      'bidderDone']
  }
});
```

| Param enableAnalytics | Scope    | Type   | Description                                                 | Example                  |
|-----------------------|----------|--------|-------------------------------------------------------------|--------------------------|
| provider              | Required | String | The name of this Adapter.                                   | `"growthCodeAnalytics"`  |
| params                | Required | Object | Details of module params.                                   |                          |
| params.pid            | Required | String | This is the Customer ID value obtained via Intimate Merger. | `"<Contact GrowthCode>"` |
| params.url            | Optional | String | Custom URL for server                                       |                          |
| params.trackEvents    | Required | String | Name if the variable that holds your publisher ID           |                          |
