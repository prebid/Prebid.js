# Overview

```
Module Name: PStudio Bid Adapter
Module Type: Bidder Adapter
Maintainer: pstudio@telkomsel.com 
```

# Description

Currently module supports banner as well as instream video mediaTypes.


# Test parameters

Those parameters should be used to get test responses from the adapter.

```js
var adUnits = [
  // Banner ad unit
  {
    code: 'test-div-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'pstudio',
        params: {
          // id of test publisher
          pubid: '22430f9d-9610-432c-aabe-6134256f11af',
          floorPrice: 1.25,
        },
      },
    ],
  },
  // Instream video ad unit
  {
    code: 'test-div-2',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [3],
      },
    },
    bids: [
      {
        bidder: 'pstudio',
        params: {
          // id of test publisher
          pubid: '22430f9d-9610-432c-aabe-6134256f11af',
          floorPrice: 1.25,
        },
      },
    ],
  },
];
```

# Sample Banner Ad Unit

```js
var adUnits = [
  {
    code: 'test-div-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
        pos: 0,
        name: 'test-name',
      },
    },
    bids: [
      {
        bidder: 'pstudio',
        params: {
          pubid: '22430f9d-9610-432c-aabe-6134256f11af', // required
          floorPrice: 1.15, // required
          bcat: ['IAB1-1', 'IAB1-3'], // optional
          badv: ['nike.com'], // optional
          bapp: ['com.foo.mygame'], // optional
        },
      },
    ],
  },
];
```

# Sample Video Ad Unit

```js
var videoAdUnits = [
  {
    code: 'test-instream-video',
    mediaTypes: {
      video: {
        context: 'instream', // required (only instream accepted)
        playerSize: [640, 480], // required (alternatively it could be pair of `w` and `h` parameters)
        mimes: ['video/mp4'], // required (only choices `video/mp4`, `application/javascript`, `video/webm` and `video/ogg` supported)
        protocols: [2, 3], // 1 required (only choices 2 and 3 supported)
        minduration: 5, // optional
        maxduration: 30, // optional
        startdelay: 5, // optional
        placement: 1, // optional (only 1 accepted, as it is instream placement)
        skip: 1, // optional
        skipafter: 1, // optional
        minbitrate: 10, // optional
        maxbitrate: 10, // optional
        delivery: 1, // optional
        playbackmethod: [1, 3], // optional
        api: [2], // optional (only choice 2 supported)
        linearity: 1, // optional
      },
    },
    bids: [
      {
        bidder: 'pstudio',
        params: {
          pubid: '22430f9d-9610-432c-aabe-6134256f11af',
          floorPrice: 1.25,
          badv: ['adidas.com'],
        },
      },
    ],
  },
];
```

# Configuration for video

### Prebid cache

For video ads, Prebid cache must be enabled, as the demand partner does not support caching of video content.

```js
pbjs.setConfig({
  cache: {
    url: 'https://prebid.adnxs.com/pbc/v1/cache',
  },
});
```

Please provide Prebid Cache of your choice. This example uses AppNexus cache, but if you use other cache, change it according to your needs.

