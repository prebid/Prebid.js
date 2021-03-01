# Overview
Module Name: Seeding Alliance Bidder Adapter
Type: Seeding Alliance Adapter
Maintainer: tech@seeding-alliance.de

# Description
Seeding Alliance Bidder Adapter for Prebid.js.

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
        bidder: 'seedingAlliance',
        params: {
	    	url  : "https://mockup.seeding-alliance.de/ssp-testing/native.html",
	    	adUnitId: "2sq2o"
        }
    }]
}];
```

