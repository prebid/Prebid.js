# Overview

```
Module Name: Appnexus Bid Adapter
Module Type: Bidder Adapter
Maintainer: info@prebid.org
```

# Description

Connects to Appnexus exchange for bids.

Appnexus bid adapter supports Banner, Video (instream and outstream) and Native.

# Test Parameters
```JavaScript
var adUnits = [
  // banner adUnit
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      },
    },
    bids: [{
      bidder: 'appnexus',
      params: {
        placementId: '10433394'
      }
    }]
  },

  // native adUnit
  {
    code: 'native-div',
    sizes: [[300, 250], [300,600]],
    mediaTypes: {
      native: {
        title: {
          required: true,
          len: 80
        },
        body: {
          required: true
        },
        brand: {
          required: true
        },
        image: {
          required: true,
          aspect_ratios: [{
            min_width: 2000,
            ratio_width: 588,
            ratio_height: 379
          }]
        },
        clickUrl: {
          required: true
        },
      }
    },
    bids: [{
      bidder: 'appnexus',
      params: {
        placementId: '9880618'
      }
    }]
  },

  // video instream adUnit
  {
    code: 'video-instream',
    sizes: [640, 480],
    mediaTypes: {
      video: {
        context: 'instream'
      },
    },
    bids: [{
      bidder: 'appnexus',
      params: {
        placementId: '9333431',
        video: {
          skippable: true,
          playback_methods: ['auto_play_sound_off']
        }
      }
    }]
  },

  // video outstream adUnit
  {
    code: 'video-outstream',
    sizes: [[640, 480]],
    mediaTypes: {
      video: {
        context: 'outstream'
      }
    },
    bids: [
      {
        bidder: 'appnexus',
        params: {
          placementId: '5768085',
          video: {
            skippable: true,
            playback_method: ['auto_play_sound_off']
          }
        }
      }
    ]
  }
];
```
