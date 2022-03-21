# Overview

```
Module Name: tribeOS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev@tribeos.io
```

# Description

tribeOS adapter

# Test Parameters
```
	var adUnits = [{
	    code: 'test-tribeos',
	    mediaTypes: {
	        banner: {
	            sizes: [
	                [300, 250]
	            ],
	        }
	    },
	    bids: [{
	        bidder: "tribeos",
	        params: {
	            placementId: '12345' // REQUIRED
	        }
	    }]
	}];
```
