# Overview

Module Name: Vrtcal Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@vrtcal.com

# Description

You can use this adapter to get a bid from vrtcal.com.


# Test Parameters
```
    var adUnits = [
        {
        code: "vrtcal-test-adunit",
            mediaTypes: {
	            banner: {
                      sizes: [[300, 250]]
                    }
            },
            bids: [
                {
                    bidder: "vrtcal"
                }
            ]
        }
    ];
```
#Vrtcal requires no extra params passed, thus no params struct included
