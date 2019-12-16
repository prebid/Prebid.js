# Overview

```
Module Name: Example Bidder Adapter
Module Type: Bidder Adapter
Maintainer: RampProgrammatic@perion.com
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
               placementId: '10433394',
               publisherId: 12345
               }
           }
         ]
       }
    ];
```
