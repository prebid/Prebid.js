# Overview

```
Module Name: Synapse HX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@compas-inc.com
```

# Description

The Synapse HX Bidder Adapter enables publishers to integrate with Synapse HX exchange for banner and video ad formats. The adapter supports OpenRTB standards and processes bid requests efficiently using the Prebid.js framework.

# Test Parameters

## Sample Banner Ad Unit
```
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300,250]]
      }
    },
    bids: [
      {
        bidder: 'synapsehx',
        params: {
          // REQUIRED - Synapse HX tenant identifier
          tenantId: 'your-account-id',
          // OPTIONAL - Synapse HX ad unit identifier
          adUnitId: 'ad-unit-id'
        }
      }
    ]
  }
];
```

## Sample Video Ad Unit
```
var videoAdUnits = [
  {
    code: 'test-div-video',
    mediaTypes: {
      video: {
        context: 'instream',
        placement: 1,
        playerSize: [640, 360],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        api: [2],
        maxduration: 30,
        linearity: 1,
        playbackmethod: [2]
      }
    },
    bids: [
      {
        bidder: 'synapsehx',
        params: {
          // REQUIRED - Synapse HX tenant identifier
          tenantId: 'your-account-id',
          // OPTIONAL - Synapse HX ad unit identifier
          adUnitId: 'ad-unit-id'
        }
      }
    ]
  }
];
```

# Additional Notes
- The adapter processes requests via OpenRTB 2.6 standards.
- Ensure that the `tenantId` parameter is set correctly for your integration.
- The `adUnitId` parameter is optional.
