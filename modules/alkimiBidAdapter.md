# Overview

```
Module Name: Alkimi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kalidas@alkimiexchange.com
```

# Description

Connects to Alkimi Bidder for bids.
Alkimi bid adapter supports Banner and Video ads.

# Test Parameters
```
const adUnits = [
  {
      code: 'banner1',
      mediaTypes: {
          banner: {   // Media Type can be banner or video or ...
              sizes: [[300, 250]],
          }
      },
      bids: [
      {
          bidder: 'alkimi',
          params: {
              bidFloor: 0.5,
              token: 'a6b042a5-2d68-4170-a051-77fbaf00203a', // Publisher Token(Id) provided by Alkimi
          }
      }
    ]
  }
]
```
