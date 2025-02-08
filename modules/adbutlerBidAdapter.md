# Overview

**Module Name**: AdButler Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: trevor@sparklit.com

# Description

Bid Adapter for creating a bid from an AdButler zone.

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
                           accountID: '181556',
                           zoneID: '705374',
                           keyword: 'red', //optional
                           minCPM: '1.00', //optional
                           maxCPM: '5.00' //optional
                       }
                   }
               ]
           }
       ];
```
