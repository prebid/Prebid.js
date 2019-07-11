# Overview

```
Module Name:  Rubicon Project Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   header-bidding@rubiconproject.com
```

# Description

Connect to Rubicon Project's exchange for bids.

The Rubicon Project adapter requires setup and approval from the
Rubicon Project team. Please reach out to your account team or
globalsupport@rubiconproject.com for more information.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250]]
                   }
               },
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
               mediaTypes: {
                   banner: {
                       sizes: [[300, 50]]
                   }
               },
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
