# Overview

Module Name: Preciso Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@preciso.net


# Description

Module that connects to Preciso's demand sources.

# Test Parameters
```
    var adUnits = [
           // banner
           {
               code: 'test-div',
               mediaTypes: {
	           banner: {
                       sizes: [[300, 250]],
                   }
               },
               bids: [
                   {
                       bidder: "preciso",
                       params: {
                           region: 'prebid-eu',
                           publisherId: 'PREBID_TEST_ID',
                           bidfloor: 0.01  // optional
                       }
                   }
               ]
           },
           // native
           {
                code: 'test-div',
                mediaTypes: {
                    native: {
                        title: {
                            required: true,
                            len: 25
                        },
                        image: {
                            required: true,
                            sizes: [300, 250]
                        },
                        body: {
                            required: true,
                            len: 90
                        }
                    }
                },
                bids: [
                    {
                        bidder: "preciso",
                        params: {
                            region: 'prebid-eu',
                            publisherId: 'PREBID_TEST_ID'
                            bidfloor: 0.01  // optional
                        }
                    }
                ]
           }
       ];
```


