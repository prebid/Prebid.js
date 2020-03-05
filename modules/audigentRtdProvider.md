Audigent is a next-generation data management platform and a first-of-a-kind 
"data agency" containing some of the most exclusive content-consuming audiences 
across desktop, mobile and social platforms.

This real-time data module provides first-party Audigent segments that can be 
attached to bid request objects destined for different SSPs in order to optimize 
targeting. Audigent maintains a large database of first-party Tradedesk Unified 
ID to third party segment mappings that can now be queried at bid-time.

Usage:

Compile the audigent RTD module into your Prebid build:

`gulp build --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,rubiconBidAdapter`

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
			adUnit.bids[j].userId.lipb.segments = adUnit.bids[j].realTimeData.audigent_segments['rubicon'];
		}
	}
}
```

To view an example of the segments returned by Audigent's backends:

`gulp serve --modules=userId,unifiedIdSystem,rtdModule,audigentRtdProvider,rubiconBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/audigentSegments_example.html`


