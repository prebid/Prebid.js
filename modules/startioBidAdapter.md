# Overview

```
Module Name: Start.io Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@start.io
```

# Description

The Start.io Bid Adapter enables publishers to integrate with Start.io's demand sources for banner, video and native ad formats. The adapter supports OpenRTB standards and processes bid requests efficiently using the Prebid.js framework.

# Test Parameters
```
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300,250], [728,90]]
      }
    },
    bids: [
      {
        bidder: 'startio',
        params: {
          // REQUIRED - Publisher Account ID
          accountId: 'your-account-id',

          // OPTIONAL - Enable test ads
          testAdsEnabled: true
        }
      }
    ]
  }
];
```

# Sample Instream Video Ad Unit: For Publishers
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
        bidder: 'startio',
        params: {
          accountId: 'your-account-id',
          testAdsEnabled: true
        }
      }
    ]
  }
];
```

# Sample Native Ad Unit: For Publishers
```
var nativeAdUnits = [
  {
    code: 'test-div-native',
    mediaTypes: {
      native: {
        title: { required: true, len: 80 },
        body: { required: true },
        image: { required: true, sizes: [150, 150] },
        icon: { required: false, sizes: [50, 50] },
        sponsoredBy: { required: true }
      }
    },
    bids: [
      {
        bidder: 'startio',
        params: {
          accountId: 'your-account-id',
          testAdsEnabled: true
        }
      }
    ]
  }
];
```

# Additional Notes
- The adapter processes requests via OpenRTB 2.5 standards.
- Ensure that the `accountId` parameter is set correctly for your integration.
- Test ads can be enabled using `testAdsEnabled: true` during development.
- The adapter supports multiple ad formats, allowing publishers to serve banners, native ads and instream video ads seamlessly.
