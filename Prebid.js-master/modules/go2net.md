# Overview

Module Name: Go2Net Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: vprytuzhalova@go2net.com.ua 

# Description

Connects to Go2Net demand source to fetch bids.  
Banner and Video formats are supported.  
Please use ```go2net``` as the bidder code.  

# Ad Unit Example
```
    var adUnits = [
           {
               code: 'desktop-banner-ad-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "go2net",
                       params: {
                           zone: 'fb3d34d0-7a88-4a4a-a5c9-8088cd7845f4'
                       }
                   }
               ]
           }
       ];
```
