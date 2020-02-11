# Overview

Module Name: Adyoulike Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adyoulike.com

# Description

Module that connects to Adyoulike demand sources.
Banner formats are supported.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "adyoulike",
                       params: {
                           placement: 194f787b85c829fb8822cdaf1ae64435,
                           DC: 'fra01', // Optional for set the data center name
                       }
                   }
               ]
           }
       ];
```
