New provider must include the following:

1. sub module object with the following keys:

|  param name | type  | Scope | Description | Params |
| :------------ | :------------ | :------ | :------ | :------ |
| name  | string  | required | must match the name provided by the publisher in the on-page config | n/a |
| gvlid | number or number[] | optional | global vendor list ID(s) of the submodule | n/a |
|  init | function | required | performs any initialization the submodule needs; return `true` to enable the submodule, `false` to disable it | config, userConsent |
|  getTargetingData  | function | optional | provides ad server targeting data to RTD-core | adUnitCodes, config, userConsent, auction |
|  getBidRequestData  | function | optional | updates the auction's request (ad units, `ortb2Fragments`) before it starts; must call `callback` when done | reqBidsConfigObj, callback, config, userConsent, timeout |
|  onAuctionInitEvent | function | optional | called on the AUCTION_INIT event | auctionDetails, config, userConsent |
|  onAuctionEndEvent | function |optional | called on the AUCTION_END event | auctionDetails, config, userConsent |
|  onBidRequestEvent | function |optional | called on the BID_REQUESTED event | bidderRequest, config, userConsent |
|  onBidResponseEvent | function |optional | called on the BID_RESPONSE event | bidResponse, config, userConsent |
|  onBidAcceptedEvent | function |optional | called on the BID_ACCEPTED event | bid, config, userConsent |
|  onDataDeletionRequest | function |optional | called when the USP CMP registers a data deletion request (`registerDeletion`) | config |

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
