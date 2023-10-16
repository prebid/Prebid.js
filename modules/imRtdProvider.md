## Intimate Merger Real-time Data Submodule

provided by Intimate Merger.

## Building Prebid with Real-time Data Support

First, make sure to add the Intimate Merger submodule to your Prebid.js package with:

`gulp build --modules=rtdModule,imRtdProvider`

The following configuration parameters are available:

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 5000,
        dataProviders: [
            {
                name: "im",
                waitForIt: true,
                params: {
                    cid: 5126, // Set your Intimate Merger Customer ID here for production
                    setGptKeyValues: true,
                    maxSegments: 200 // maximum number is 200
                }
            }
        ]
    }
    ...
}
```

### Parameter Descriptions for the im Configuration Section

| Param under dataProviders | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"im"` |
| waitForIt | Optional | Boolean | Required to ensure that the auction is delayed until prefetch is complete. Defaults to false but recommended to true | `true` |
| params | Required | Object | Details of module params. | |
| params.cid | Required | Number | This is the Customer ID value obtained via Intimate Merger. | `5126` |
| params.setGptKeyValues | Optional | Boolean | This is set targeting for GPT/GAM. Default setting is true. | `true` |
| params.maxSegments | Optional | Number | This is set maximum number of rtd segments at once. Default setting is 200. | `200` |
