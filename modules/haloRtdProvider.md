## Audigent Halo Real-time Data Submodule

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

Compile the Halo RTD module into your Prebid build:

`gulp build --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,appnexusBidAdapter`

Add the Halo RTD provider to your Prebid config.  For any adapters
that you would like to retrieve segments for, add a mapping in the 'mapSegments'
parameter.  In this example we will configure publisher 1234 to retrieve
appnexus segments from Audigent. See the "Parameter Descriptions" below for
more detailed information of the configuration parameters. Currently,
OpenRTB compatible fpd data will be added for any bid adapter in the
"mapSegments" objects. Automated bid augmentation exists for some bidders.
Please work with your Audigent Prebid support team (prebid@audigent.com) on
which version of Prebid.js supports which bidders automatically.

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: auctionDelay,
        dataProviders: [
            {
                name: "halo",
                waitForIt: true,
                params: {
                    mapSegments: {
                        appnexus: true,
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

### Parameter Descriptions for the Halo `dataProviders` Configuration Section

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Real time data module name | Always 'halo' |
| waitForIt | Boolean | Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false |
| params | Object | | |
| params.mapSegments | Boolean | Dictionary of bidders you would like to supply Audigent segments for. Maps to boolean values, but also allows functions for custom mapping logic. The function signature is (bid, segments) => {}. | Required |
| params.segmentCache | Boolean | This parameter tells the Halo RTD module to attempt reading segments from a local storage cache instead of always requesting them from the Audigent server. | Optional. Defaults to false. |
| params.requestParams | Object | Publisher partner specific configuration options, such as optional publisher id and other segment query related metadata to be submitted to Audigent's backend with each request.  Contact prebid@audigent.com for more information. | Optional |

### Overriding & Adding Segment Mappers
As indicated above, it is possible to provide your own bid augmentation
functions.  This is useful if you know a bid adapter's API supports segment
fields which aren't specifically being added to request objects in the Prebid
bid adapter.  You can also override segment mappers by passing a function
instead of a boolean to the Halo RTD segment module.  This might be useful
if you'd like to use custom logic to determine which segments are sent
to a specific backend.

Please see the following example, which provides a function to modify bids for
a bid adapter called adBuzz and overrides the appnexus segment mapper.

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: auctionDelay,
        dataProviders: [
            {
                name: "halo",
                waitForIt: true,
                params: {
                    mapSegments: {
                        // adding an adBuzz segment mapper
                        adBuzz: function(bid, segments) {
                            bid.params.adBuzzCustomSegments = [];
                            for (var i = 0; i < segments.length; i++) {
                                bid.params.adBuzzCustomSegments.push(segments[i].id);
                            }
                        },
                        // overriding the appnexus segment mapper to exclude certain segments
                        appnexus: function(bid, segments) {
                            for (var i = 0; i < segments.length; i++) {
                                if (segments[i].id != 'exclude_segment') {
                                    bid.params.user.segments.push(segments[i].id);
                                }
                            }
                        }
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

More examples can be viewed in the haloRtdAdapter_spec.js tests.

### Testing

To view an example of available segments returned by Audigent's backends:

`gulp serve --modules=userId,unifiedIdSystem,rtdModule,haloRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/haloRtdProvider_example.html`




