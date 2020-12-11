# Overview

Module Name: AdBlender Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: contact@adblender.net

# Description

Connects to Go2Net demand source to fetch bids.  
Banner and Video formats are supported.  
Please use ```adblender``` as the bidder code.  

# Ad Unit Example
```
    var adUnits = [
           {
               code: 'desktop-banner-ad-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "adblender",
                       params: {
                           zone: 'fb3d34d0-7a88-4a4a-a5c9-8088cd7845f4'
                       }
                   }
               ]
           }
       ];
```
