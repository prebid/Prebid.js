# Overview

```
Module Name: pubGENIUS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: meng@pubgenius.io
```

# Description

Module that connects to pubGENIUS's demand sources

# Test Parameters

```
var adUnits = [
  {
    code: 'test-desktop-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'pubgenius',
        params: {
          adUnitId: '1000',
          test: true
        }
      }
    ]
  },
  {
    code: 'test-mobile-banner',
    mediaTypes: {
      banner: {
        sizes: [[320, 50]]
      }
    },
    bids: [
      {
        bidder: 'pubgenius',
        params: {
          adUnitId: '1000',
          test: true
        }
      }
    ]
  },
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 360],
        mimes: ['video/mp4'],
        protocols: [3],
      }
    },
    bids: [
      {
        bidder: 'pubgenius',
        params: {
          adUnitId: '1001',
          test: true,

          // other video parameters as in OpenRTB v2.5 spec
          video: {
            skip: 1

            // the following overrides mediaTypes.video of the ad unit
            placement: 1,
            w: 640,
            h: 360,
            mimes: ['video/mp4'],
            protocols: [3],
          }
        }
      }
    ]
  },
];
```

# Optional Config

By default, the adapter uses the page URL as provided in referer info by Prebid.js.
The following config overrides this behavior and specifies the URL to be used:
```
pbjs.setConfig({
  pageUrl: 'https://example.com/top-page-url/'
});
```
