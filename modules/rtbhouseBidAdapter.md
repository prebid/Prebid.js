# Overview

Module Name: RTB House Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@rtbhouse.com

# Description

Connects to RTB House unique demand.
Banner and native formats are supported.
Unique publisherId is required. 
Please reach out to pmp@rtbhouse.com to receive your own

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
                       bidder: "rtbhouse",
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
                        bidder: "rtbhouse",
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
