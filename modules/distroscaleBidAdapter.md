# Overview

```
Module Name:  DistroScale Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@distroscale.com
```

# Description

Connects to DistroScale exchange for bids.  DistroScale bid adapter supports Banner currently.

# Test Parameters
```
var adUnits = [{
	code: 'banner-1',
	mediaTypes: {
		banner: {
			sizes: [[970, 250]],
		}
	},
	bids: [{
		bidder: 'distroscale',
		params: {
			pubid: '12345'   // required, must be a string
			,zoneid: '67890' // optional, must be a string
		}
	}]
}];
```
