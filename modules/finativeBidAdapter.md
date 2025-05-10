# Overview
Module Name: Finative Bidder Adapter
Type: Finative Adapter
Maintainer: tech@finative.cloud

# Description
Finative Bidder Adapter for Prebid.js.

# Test Parameters
```
var adUnits = [{
    code: 'test-div',

    mediaTypes: {
        native: {
            title: {
                required: true,
                len: 50
            },
            body: {
                required: true,
                len: 350
            },
            url: {
                required: true
            },
            image: {
                required: true,
                sizes : [300, 175]
            },
            sponsoredBy: {
                required: true
            }
        }
    },
    bids: [{
        bidder: 'finative',
        params: {
	    	url  : "https://mockup.finative.cloud",
	    	adUnitId: "1uyo"
        }
    }]
}];
```

