# Overview

Module Name: Rubicon Project Bid Adapter
Module Type: Bidder Adapter
Maintainer: header-bidding@rubiconproject.com

# Description

Connects to Rubicon Project's exchange for bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "rubicon",
                       params: {
                           accountId: 1001,
                           siteId: 113932,
                           zoneId: 535510
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[300, 50]],
               bids: [
                   {
                       bidder: "rubicon",
                       params: {
                           accountId: 1001,
                           siteId: 113932,
                           zoneId: 535510
                       }
                   }
               ]
           }
       ];
```
