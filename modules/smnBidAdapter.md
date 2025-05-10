# Overview

Module Name: SMN Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: smnoffice.belgrade@gmail.com

# Description

Connects to SMN demand source to fetch bids.  
Banner and Video formats are supported.  
Please use ```smn``` as the bidder code.  

# Test Parameters
```
    var adUnits = [
           {
               code: 'desktop-banner-ad-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "smn",
                       params: {
                           zone: '2eb6bd58-865c-47ce-af7f-a918108c3fd2'
                       }
                   }
               ]
           },{
               code: 'mobile-banner-ad-div',
               sizes: [[300, 50]],   // a mobile size
               bids: [
                   {
                       bidder: "smn",
                       params: {
                           zone: '62211486-c50b-4356-9f0f-411778d31fcc'
                       }
                   }
               ]
           },{
               code: 'video-ad',
               sizes: [[300, 50]],
               mediaType: 'video',
               bids: [
                   {
                       bidder: "smn",
                       params: {
                           zone: 'ebeb1e79-8cb4-4473-b2d0-2e24b7ff47fd'
                       }
                   }
               ]
           },
       ];
```
