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

`gulp build --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,rubiconBidAdapter`

Configure Prebid to add the Audigent RTD Segment Handler:
```
pbjs.setConfig(
	...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
        	{
        		name: "audigent",
        		waitForIt: true
        	}
        ]
    }
    ...
}
```

Audigent segments will then be attached to each bid request objects in
`bid.realTimeData.audigent_segments`

The format of the segments is a per-SSP mapping:

```
{
	'appnexus': ['anseg1', 'anseg2'],
	'google': ['gseg1', 'gseg2']
}
```

If a given SSP's API backend supports segment fields, they can then be
attached prior to the bid request being sent:

```
pbjs.requestBids({bidsBackHandler: addAudigentSegments});

function addAudigentSegments() {
	for (i = 0; i < adUnits.length; i++) {
		let adUnit = adUnits[i];
		for (j = 0; j < adUnit.bids.length; j++) {
			adUnit.bids[j].userId.lipb.segments = adUnit.bids[j].audigent_segments['rubicon'];
		}
	}
}
```

### Testing

To view an example of available segments returned by Audigent's backends:

`gulp serve --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,rubiconBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/audigentSegments_example.html`


