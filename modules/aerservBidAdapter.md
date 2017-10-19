# Overview

```
Module Name: AerServ Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dlawrence@aerserv.com, techology@aerserv.com
```

# Description

Connects to AerServ demand sources to fetch bids. Supports banner and video ads. 
Please reach out to your account manager or pubaccounts@aerserv.com for more information.

# Test Parameters
```
    var adUnits = [
           {
               code: 'banner-div',
               sizes: [[320, 50]],
               bids: [
                   {
                       bidder: 'aerserv',
                       params: {
                           plc: 1028582
                       }
                   }
               ]
           },{
               code: 'video-div',
               sizes: [[320, 250]],
               mediaTypes: { video: {} }, 
               bids: [
                   {
                       bidder: 'aerserv',
                       params: {
                           plc: 1028581,
                           video: {
                              vpw: '640',
                              vph: '480' 
                           }
                       }
                   }
               ]
           }
       ];
```
