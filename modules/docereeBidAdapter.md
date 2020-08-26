# Overview

Module Name: Doceree Bidder Adapter  
Module Type: Bidder Adapter  

# Description

Connects to Doceree demand source to fetch bids.  
Please use ```doceree``` as the bidder code.  

# Test Parameters
```
    var adUnits = [
           {
               code: 'desktop-banner-ad-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "doceree",
                       params: {
                           accountID: '167283',
                           zoneID: '445501',
                           domain: 'adbserver.doceree.com',
                           extra: {
                               tuid: '1234-abcd'
                           }
                       }
                   }
               ]
           },
       ];
```
