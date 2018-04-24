# Overview

```
Module Name: Digital Garage Ads Platform Bidder Adapter
Module Type: Bidder Adapter
Maintainer:dgads-support@garage.co.jp
```

# Description

Connect to Digital Garage Ads Platform for bids.  
This adapter supports Banner and Native.

# Test Parameters
```
  var adUnits = [
  // Banner
  {
    code: 'banner-div',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'dgads',
      mediaTypes: 'banner',
      params: {
        location_id: '1',
        site_id: '1'
      }
    }]
  },
  // Native
  {
     code: 'native-div',
     sizes: [[300, 250]],
     mediaTypes: {
       native: {
         title: {
           required: true,
           len: 25
         },
         body: {
           required: true,
           len: 140
         },
         sponsoredBy: {
           required: true,
           len: 40
         },
         image: {
           required: true
         },
         clickUrl: {
           required: true
         },
       }
     },
     bids: [{
       bidder: 'dgads',
       params: {
         location_id: '10',
         site_id: '1'
       }
     }]
    },
  ];
```
