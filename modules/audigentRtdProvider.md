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

### Usage

Compile the audigent RTD module into your Prebid build:

`gulp build --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,appnexusBidAdapter`


The format of returned segments is a segment type mapping.

```
{
    'appnexus': ['anseg1', 'anseg2'],
    'pubmatic': ['pseg1', 'pseg2'],
    'spotx': ['sseg1', 'sseg2']
}
```

Add the Audigent RTD provider to your Prebid config, and add any adapters
you would like to specifically provide segments for.  Segments will be mapped
into the bid request objects for these adapters.

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
                    publisherId: 1234
                }
            }
        ]
    }
    ...
}
```

### Testing

To view an example of available segments returned by Audigent's backends:

`gulp serve --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/audigentSegments_example.html`


