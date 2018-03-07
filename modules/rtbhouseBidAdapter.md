# Overview

Module Name: RTB House Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@rtbhouse.com

# Description

Connects to RTB House unique demand.
Banner formats are supported.
Unique publisherId is required. 
Please reach out to pmp@rtbhouse.com to receive your own

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "rtbhouse",
                       params: {
                           region: 'prebid-eu',
                           publisherId: 'PREBID_TEST_ID'
                       }
                   }
               ]
           }
       ];
```
