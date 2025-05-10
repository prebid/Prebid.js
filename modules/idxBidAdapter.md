# Overview

```
Module Name: IDX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dmitry@brainway.co.il
```

# Description

Module that connects to the IDX solution.
The IDX bidder need one mediaTypes parameter: banner

# Test Parameters
```
    var adUnits = [{
      code: 'your-slot-div-id', // This is your slot div id
      mediaTypes: {
          banner: {
              sizes: [[300, 250]]
          }
      },
      bids: [{
          bidder: 'idx',
          params: {}
      }]
    }]
```
