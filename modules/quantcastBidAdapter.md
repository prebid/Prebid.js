# Overview

```
Module Name: Quantcast Bidder Adapter
Module Type: Bidder Adapter
Maintainer: inventoryteam@quantcast.com
```

# Description

Module that connects to Quantcast demand sources to fetch bids.

# Test Parameters

## Sample Banner Ad Unit
```js
const adUnits = [{
  code: 'banner',
  sizes: [
    [300, 250]
  ],
  bids: [
    {
      bidder: 'quantcast',
      params: {
        publisherId: 'test-publisher', // REQUIRED - Publisher ID provided by Quantcast
        battr: [1, 2] // OPTIONAL - Array of blocked creative attributes as per OpenRTB Spec List 5.3
      }
    }
  ],
  userSync: {
    url: 'https://quantcast.com/pixelUrl'
  }
}];
```

## Sample Video Ad Unit
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
      bidder: 'quantcast',
      params: {
        publisherId: 'test-publisher', // REQUIRED - Publisher ID provided by Quantcast
        // Video object as specified in OpenRTB 2.5
        video: {
          mimes: ['video/mp4'], // required
          minduration: 3,       // optional
          maxduration: 5,       // optional
          protocols: [3],       // optional
          startdelay: 1,        // optional
          linearity: 1,         // optinal
          battr: [1, 2],        // optional
          maxbitrate: 10,       // optional
          playbackmethod: [1],  // optional
          delivery: [1],        // optional
          placement: 1,         // optional
          api: [2, 3]           // optional
        }
      }
    }
  ],
  userSync: {
    url: 'https://quantcast.com/pixelUrl'
  }
}];
```
