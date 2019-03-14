# Overview

```
Module Name: Synacor Media Bidder Adapter
Module Type: Bidder Adapter
Maintainer: eng-demand@synacor.com
```

# Description

The Synacor Media adapter requires setup and approval from Synacor.
Please reach out to your account manager for more information.

# Test Parameters

## Web
```
  var adUnits = [{
      code: 'test-div',
      sizes: [
          [300, 250]
      ],
      bids: [{
          bidder: "synacormedia",
          params: {
              seatId: "prebid",
              placementId: "81416",
              bidfloor: "0.10",
              pos: 1
          }
      }]
  },{
      code: 'test-div2',
      sizes: [
          [300, 250]
      ],
      bids: [{
          bidder: "synacormedia",
          params: {
              seatId: "prebid",
              placementId: "demo2"
              bidfloor: "0.10",
              pos: 1
          }
      }]
  }];
```
