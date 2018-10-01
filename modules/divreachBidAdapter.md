# Overview

Module Name: DivReach Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: Zeke@divreach.com  

# Description

Connects to DivReach demand source to fetch bids.  
Banner and Video formats are supported.  
Please use ```divreach``` as the bidder code.  

# Test Parameters
```
    var adUnits = [
           {
               code: 'desktop-banner-ad-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "divreach",
                       params: {
                           zone: '261eae83-0508-4e1a-8c9b-19561fa9279e'
                       }
                   }
               ]
           },{
               code: 'mobile-banner-ad-div',
               sizes: [[300, 50]],   // a mobile size
               bids: [
                   {
                       bidder: "divreach",
                       params: {
                           zone: '561e26ea-1999-4fb6-ad0b-9d72929e545e'
                       }
                   }
               ]
           },{
               code: 'video-ad',
               sizes: [[300, 50]],
               mediaType: 'video',
               bids: [
                   {
                       bidder: "divreach",
                       params: {
                           zone: 'e784ecbe-720f-46f7-8388-aff8c2c4ed86'
                       }
                   }
               ]
           },
       ];
```
