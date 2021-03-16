# Overview

```
Module Name: Seedtag Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@seedtag.com
```

# Description

Module that connects to Seedtag demand sources to fetch bids.

# Test Parameters

## Sample Banner Ad Unit

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
          placement: 'banner',              // required
          adPosition: 0                     // optional
        }
      }
    ]
  }
]
```

## Sample inStream Video Ad Unit

```js
var adUnits = [{
  code: 'video',
  mediaTypes: {
    video: {
      context: 'instream',   // required
      playerSize: [600, 300] // required
    }
  },
  bids: [
    {
      bidder: 'seedtag',
      params: {
        publisherId: '0000-0000-01',    // required
        adUnitId: '0000',               // required
        placement: 'video',             // required
        adPosition: 0,                  // optional
        // Video object as specified in OpenRTB 2.5
        video: {
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
      }
    }
  ]
}];
```
