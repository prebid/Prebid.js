# Overview

```
Module Name: myTarget Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support_target@corp.my.com
```

# Description

Module that connects to myTarget demand sources.

# Test Parameters

```
    var adUnits = [{
      code: 'placementCode',
      mediaTypes: {
        banner: {
          sizes: [[240, 400]],
        }
      },
      bids: [{
        bidder: 'mytarget',
        params: {
          placementId: '379783',

          // OPTIONAL: custom bid floor
          bidfloor: 10000,

          // OPTIONAL: if you know the ad position on the page, specify it here
          //           (this corresponds to "Ad Position" in OpenRTB 2.3, section 5.4)
          position: 0,

          // OPTIONAL: bid response type: 0 - ad url (default), 1 - ad markup
          response: 0
        }
      }]
    }];
```
