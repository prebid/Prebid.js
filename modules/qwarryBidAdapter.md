# Overview

```
Module Name: Qwarry Bidder Adapter
Module Type: Bidder Adapter
Maintainer: akascheev@asteriosoft.com
```

# Description

Connects to Qwarry Bidder for bids.
Qwarry bid adapter supports Banner and Video ads.

# Test Parameters
```
const adUnits = [
  {
    bids: [
      {
          bidder: 'qwarry',
          params: {
              zoneToken: '?????????????????????', // zoneToken provided by Qwarry
          }
      }
    ]
  }
];
```
