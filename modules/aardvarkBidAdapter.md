# Overview

**Module Name**: Aardvark Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: chris@rtk.io

# Description

Module that connects to a RTK.io Ad Units to fetch bids.

# Test Parameters
```
    var adUnits = [{
      mediaTypes: {
          banner: {
              sizes: [[300, 250], [300,600]],
          }
      },
      code: 'div-gpt-ad-1460505748561-0',

      bids: [{
        bidder: 'aardvark',
        params: {
          ai: '7Dwb',
          sc: 'WygO'
        }
      }]

    }];
```