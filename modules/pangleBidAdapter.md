# Overview

Module Name: pangle Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pangle_dsp@bytedance.com

# Description

An adapter to get a bid from pangle DSP.

# Test Parameters
```
var adUnits = [{
	// banner
	code: 'test1',
	mediaTypes: {
		banner: {
			sizes: [[300, 250]]
		}
	},
	
	bids: [{
		bidder: 'pangle',
		params: {
			appid: 612,
			placementid: 123,
		}
	}]
}];
```


Where:

* placementid - Placement ID of the ad unit (required)
* appid - app ID of the ad unit (required)
