# Overview

```
Module Name:  Eywamedia Bid Adapter
Module Type:  Bidder Adapter
Maintainer: sharath@eywamedia.com
Note: Our ads will only render in mobile and desktop
```

# Description

Connects to Eywamedia Ad Server for bids.

Eywamedia bid adapter supports Banners.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'div-gpt-ad-1460505748561-0', 
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'eywamedia',
         params: {
           publisherId: 'f63a2362-5aa4-4829-bbd2-2678ced8b63e', //Required - GUID (may include numbers and characters) 
           bidFloor: 0.50, // optional
           cats: ["iab1-1","iab23-2"], // optional
           keywords: ["sports", "cricket"],  // optional
           lat: 12.33333, // optional
           lon: 77.32322, // optional
           locn: "country$region$city$zip"  // optional
         }
       }]
   }
];
```
