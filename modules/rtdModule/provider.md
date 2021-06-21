New provider must include the following:

1. sub module object with the following keys:

|  param name | type  | Scope | Description | Params |
| :------------ | :------------ | :------ | :------ | :------ |
| name  | string  | required | must match the name provided by the publisher in the on-page config | n/a |
|  init | function | required | defines the function that does any auction-level initialization required | config, userConsent |
|  getTargetingData  | function | optional | defines a function that provides ad server targeting data to RTD-core | adUnitArray, config, userConsent |
|  getBidRequestData  | function | optional | defines a function that provides ad server targeting data to RTD-core | reqBidsConfigObj, callback, config, userConsent  |
|  onAuctionInitEvent | function | optional | listens to the AUCTION_INIT event and calls a sub-module function that lets it inspect and/or update the auction | auctionDetails, config, userConsent |
|  onAuctionEndEvent | function |optional | listens to the AUCTION_END event and calls a sub-module function that lets it know when auction is done | auctionDetails, config, userConsent |
|  onBidResponseEvent | function |optional | listens to the BID_RESPONSE event and calls a sub-module function that lets it know when a bid response has been collected | bidResponse, config, userConsent |

2. `getTargetingData` function (if defined) should return ad unit targeting data according to the following structure:
```json
{
  "adUnitCode":{
      "key":"value",
      "key2":"value"
  },
  "adUnitCode2":{
      "dataKey":"dataValue"
  }
}
``` 

3. Hook to Real Time Data module:
```javascript
submodule('realTimeData', subModuleName);
```

4. See detailed documentation [here](https://docs.prebid.org/dev-docs/add-rtd-submodule.html)
