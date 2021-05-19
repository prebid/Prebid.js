# Overview

Module Name: ETARGET Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@etarget.sk

# Description

Module that connects to ETARGET demand sources to fetch bids.
Banner and video formats are supported.

# Test Parameters
```
    var adUnits = [
           {
               code: 'div-gpt-ad-1460505748561-0', // ID of elemnt where ad will be shown
               sizes: [[300, 250], [300, 300], [300, 600], [160, 600]],  // a display size
               bids: [
                   {
                       bidder: "etarget",
                       params: {
                           country: 1,
                           refid: 12345,
                           options: {
                              site: 'example.com'
                           }
                       }
                   }
               ]
           }
       ];
```
