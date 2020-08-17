# Overview

```
Module Name:  Bright Mountain Media Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: dev@brightmountainmedia.com
```

# Description

Connects to Bright Mountain Media exchange for bids.

Bright Mountain Media bid adapter currently supports Banner.

# Test Parameters
```
 var adUnits = [
      code: 'placementid_0',
      mediaTypes: {
          banner: {
              sizes: [[300, 250]]
          }
      },
      bids: [
          {
              bidder: 'brightmountainmedia',
              params: {
                  placement_id: '5f21784949be82079d08c',
                  traffic: 'banner'
              }
          }
      ]
    ];
```