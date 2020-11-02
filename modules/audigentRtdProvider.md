## Audigent Real-time Data Submodule

Audigent is a next-generation data management platform and a first-of-a-kind
"data agency" containing some of the most exclusive content-consuming audiences
across desktop, mobile and social platforms.

This real-time data module provides quality user segmentation that can be
attached to bid request objects destined for different SSPs in order to optimize
targeting. Audigent maintains a large database of first-party Tradedesk Unified
ID, Audigent Halo ID and other id provider mappings to various third-party
segment types that are utilizable across different SSPs.  With this module,
these segments can be retrieved and supplied to the SSP in real-time during
the bid request cycle.

### Publisher Usage

Compile the audigent RTD module into your Prebid build:

`gulp build --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,appnexusBidAdapter`

Add the Audigent RTD provider to your Prebid config.  For any adapters
that you would like to retrieve segments for, add a mapping in the 'mapSegments'
parameter.  In this example we will configure publisher 1234 to retrieve
appnexus segments from Audigent. See the "Parameter Descriptions" below for
more detailed information of the configuration parameters.

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: auctionDelay,
        dataProviders: [
            {
                name: "audigent",
                waitForIt: true,
                params: {
                    mapSegments: {
                        'appnexus': true,
                    },
                    segmentCache: false,
                    requestParams: {
                        publisherId: 1234
                    }
                }
            }
        ]
    }
    ...
}
```

### Parameter Descriptions for the Audigent `dataProviders` Configuration Section

params.mapSegments | Required | Object
Dictionary of bidders you would like to supply Audigent segments for.
Maps to boolean values, but also allows functions for custom mapping logic.
The function signature is (bid, segments) => {}.

params.segmentCache | Optional | Boolean
This parameter tells the Audigent RTD module to attempt reading segments
from a local storage cache instead of always requesting them from the
Audigent server.

params.requestParams | Optional | Object
Publisher partner specific configuration options, such as optional publisher id
and other segment query related metadata to be submitted to Audigent's
backend with each request.  Contact prebid@audigent.com for more information.


### Testing

To view an example of available segments returned by Audigent's backends:

`gulp serve --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/audigentSegments_example.html`




