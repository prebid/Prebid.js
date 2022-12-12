# Overview

```
Module Name: Seedtag Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@seedtag.com
```

# Description

Prebidjs seedtag bidder

# Sample integration

## InScreen
```js
const adUnits = [
  {
    code: '/21804003197/prebid_test_320x100',
    mediaTypes: {
      banner: {
        sizes: [[320, 100]]
      }
    },
    bids: [
      {
        bidder: 'seedtag',
        params: {
          publisherId: '0000-0000-01',      // required
          adUnitId: '0000',                 // required
          placement: 'inScreen',              // required
        }
      }
    ]
  }
]
```

## InArticle
```js
const adUnits = [
  {
    code: '/21804003197/prebid_test_300x250',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [1, 1]]
      }
    },
    bids: [
      {
        bidder: 'seedtag',
        params: {
          publisherId: '0000-0000-01',      // required
          adUnitId: '0000',                 // required
          placement: 'inArticle',              // required
        }
      }
    ]
  }
]
```

## InBanner
```js
const adUnits = [
  {
    code: '/21804003197/prebid_test_300x250',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'seedtag',
        params: {
          publisherId: '0000-0000-01',      // required
          adUnitId: '0000',                 // required
          placement: 'inBanner',              // required
        }
      }
    ]
  }
]
```

## inStream Video
```js
var adUnits = [{
  code: 'video',
  mediaTypes: {
    video: {
      context: 'instream',   // required
      playerSize: [640, 360], // required
      // Video object as specified in OpenRTB 2.5
      mimes: ['video/mp4'], // recommended
      minduration: 5,       // optional
      maxduration: 60,      // optional
      boxingallowed: 1,     // optional
      skip: 1,              // optional
      startdelay: 1,        // optional
      linearity: 1,         // optional
      battr: [1, 2],        // optional
      maxbitrate: 10,       // optional
      playbackmethod: [1],  // optional
      delivery: [1],        // optional
      placement: 1,         // optional
    }
  },
  bids: [
    {
      bidder: 'seedtag',
      params: {
        publisherId: '0000-0000-01',    // required
        adUnitId: '0000',               // required
        placement: 'inStream',          // required
      }
    }
  ]
}];
```
