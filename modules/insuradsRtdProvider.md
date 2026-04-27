## InsurAds Real-time Data Submodule

The [InsurAds](https://insurads.com) real-time data module in Prebid enables publishers to leverage
contextual targeting and audience segmentation capabilities. This module provides real-time
key-value targeting data that seamlessly integrates into your existing Prebid deployment,
helping you maximize your advertising strategies.

## Building Prebid with InsurAds Support

Compile the InsurAds RTD module into your Prebid build:

`gulp serve --modules=rtdModule,insuradsBidAdapter,insuradsRtdProvider`

Please visit https://insurads.com/ for more information.

```javascript
pbjs.setConfig({
    ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [{
            name: 'insuradsRtd',
            waitForIt: true,
            params: {
                publicId: 'YOUR_PUBLIC_ID',
                timeout: 1000
            }
        }]
    }
    ...
});
```

### Parameter Descriptions for the InsurAds Configuration Section

| Name              | Type    | Description                                                               | Notes                    |
|:------------------|:--------|:--------------------------------------------------------------------------|:-------------------------|
| name              | String  | Real time data module name                                                | Always 'insuradsRtd'     |
| waitForIt         | Boolean | When true, delays the auction until this provider calls back (bounded by `auctionDelay` / `params.timeout`) | Optional. Defaults to false |
| params            | Object  |                                                                           |                          |
| params.publicId   | String  | This is the Public ID value obtained from InsurAds                        | Required                 |
| params.timeout    | Number  | Max time (ms) to wait for the InsurAds API response before continuing the auction without enrichment | Optional. Defaults to 1000 |

## Testing

To view an example of InsurAds RTD provider:

`gulp serve --modules=rtdModule,insuradsBidAdapter,insuradsRtdProvider`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/insurads.html`

## How It Works

The InsurAds RTD provider:

1. Fetches contextual targeting data from the InsurAds API using your `publicId`
2. Stores the returned key-values internally
3. Enriches bid requests for the `insurads` bidder by attaching the key-values onto `bid.params.rtdData`
4. Leaves other bidders unchanged
