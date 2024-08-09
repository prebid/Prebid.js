# Overview

**Module Name**: AdButler Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: dan@sparklit.com

# Description

Module that connects to an AdButler zone to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'display-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "adbutler",
                       params: {
                           accountID: '167283',
                           zoneID: '210093',
                           keyword: 'red', //optional
                           minCPM: '1.00', //optional
                           maxCPM: '5.00' //optional
                           extra: { // optional
                                foo: "bar" 
                           }
                       }
                   }
               ]
           }
       ];
```
