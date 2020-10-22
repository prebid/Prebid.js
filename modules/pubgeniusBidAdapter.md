# Overview

```
Module Name: pubGENIUS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: meng@pubgenius.io
```

# Description

Module that connects to pubGENIUS's demand sources

# Test Parameters

Test bids have $0.01 CPM by default. Use `bidFloor` in bidder params to control CPM for testing purposes.

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
          bidFloor: 0.5,
          test: true
        }
      }
    ]
  }
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
