## Dynamic Price Floors

### Setup
```javascript
pbjs.setConfig({
  floors: {
    enabled: true, //defaults to true
    enforcement: {
      floorDeals: false, //defaults to false
      bidAdjustment: true, //defaults to true
      enforceJS: true //defaults to true
    },
    auctionDelay: 150, // in milliseconds defaults to 0
    endpoint: {
      url: 'http://localhost:1500/floor-domains',
      method: 'GET' // Only get supported for now
    },
    data: {
      schema: {
        fields: ['mediaType', 'size']
      },
      values: {
        'banner|300x250': 0.86,
        'banner|300x600': 0.97,
        'banner|728x90': 1.12,
        'banner|*': 0.54,
        'video|640x480': 6.76,
        'video|1152x648': 11.76,
        'video|*': 4.55,
        '*|*': 0.30
      },
      default: 0.01
    }
  }
});
```

| Parameter              | Description                                                                                                         |
|------------------------|---------------------------------------------------------------------------------------------------------------------|
| enabled                | Wether to turn off or on the floors module                                                                          |
| enforcement            | object of booleans which control certain features of the module                                                     |
| auctionDelay           | The time to suspend and auction while waiting for a real time price floors fetch to come back                       |
| endpoint               | An object describing the endpoint to retrieve floor data from. GET only                                             |
| data                   | The data to be used to select appropriate floors. See schema for more detail                                        |
| additionalSchemaFields | An object of additional fields to be used in a floor data object. The schema is KEY: function to retrieve the match |

### Passing floors to Bid Adapters
Because it is possible for many rules to match any given bidRequest, (wether it be due to more than one size or more than one mediaType), an encapsolated function is to be passed to bidders which will allow bidders to have insight as to what the floor could be.

The function `getFloor` will be attached to every bidRequestObject passed to bid adapters if the price floors are enabled for a given auction.

This function can takes in an object with the following optional parameters:

| Parameter | Description                                                            | Example    | Default |
|-----------|------------------------------------------------------------------------|------------|---------|
| currency  | The 3 character currency code which the bid adapter wants the floor in | "JPY"      | "USD"   |
| mediaType | The specific mediaType to get a floor for                              | "banner"   | "*"     |
| size      | The specific size to get a matching floor on                           | [300, 250] | "*"     |

If a bid adapter passes in `*` as an attribute, then the `priceFloors` module will attempt to select the best rule based on context.

For example, if an adapter passes in a `*`, but the bidRequest only has a single size and a single mediaType, then the `getFloor` function will attempt to get a rule for that size before matching with the `*` catch-all. Similarily, if mediaType can be inferred on the bidRequest, it will use it.