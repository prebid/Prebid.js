# Overview

```
Module Name: Undertone Bidder Adapter
Module Type: Bidder Adapter
Maintainer: RampProgrammatic@perion.com
gdpr_supported: true
usp_supported: true
schain_supported: true
media_types: video, native
```
# Description

Module that connects to Undertone's demand sources

# Test Parameters
```
    var adUnits = [
       {
         code: 'test-div',
         sizes: [[300, 250]],
         bids: [
           {
             bidder: "undertone",
             params: {
               placementId: 1234,
               publisherId: 12345
               }
           }
         ]
       }
    ];
```
