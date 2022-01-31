# Overview

Module Name: AdBlender Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: contact@ad-blender.com

# Description

Connects to AdBlender demand source to fetch bids.  
Banner and Video formats are supported.  
Please use ```adblender``` as the bidder code.  
#Bidder Config
You can set an alternate endpoint url `pbjs.setBidderConfig` for the bidder `adblender`
```
pbjs.setBidderConfig({
        bidders: ["adblender"],
        config: {"adblender": { "endpoint_url": "https://inv-nets.admixer.net/adblender.1.1.aspx"}}
      })
```
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
