# Overview

Module Name: eClick Bid Adapter
Type: Bidder Adapter
Maintainer: vietlv14@fpt.com

# Description

This module connects to eClick exchange for bidding NATIVE ADS via prebid.js

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
        bidder: 'eclick',
        params: {
	    	zid:"7096"
        }
    }]
}];
```

# Notes:

- eClickBidAdapter need serveral params inside bidder config as following
  - user.myvne_id
  - site.orig_aid
  - site.fosp_aid
  - site.id
  - site.orig_aid
- eClickBidAdapter will set bid.adserverTargeting.hb_ad_eclick targeting key while submitting bid to AdServer
