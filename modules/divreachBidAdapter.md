# Overview

Module Name: DivReach Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: Zeke@divreach.com  

# Description

Connects to DivReach demand source to fetch bids.  
Please use ```divreach``` as the bidder code.  

# Test Parameters
```
    var adUnits = [
           {
               code: 'desktop-banner-ad-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "divreach",
                       params: {
                           accountID: '167283',
                           zoneID: '335105',
                           domain: 'ad.divreach.com',
                       }
                   }
               ]
           },
       ];
```
