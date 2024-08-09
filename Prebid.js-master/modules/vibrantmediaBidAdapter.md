## Overview

**Module Name:** Vibrant Media Bidder Adapter

**Module Type:** Bidder Adapter

**Maintainer:** kormorant@vibrantmedia.com

## Description

Module that allows Vibrant Media to provide ad bids for banner, native and video (outstream only).

## Test Parameters

```javascript
var adUnits = [
  // Banner ad unit
  {
    code: 'test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    bids: [{
      bidder: 'vibrantmedia',
      params: {
        placementId: 12345
      }
    }]
  },

  // Video (outstream) ad unit
  {
    code: 'test-video-outstream',
    sizes: [[300, 250]],
    mediaTypes: {
      video: {
        playerSize: [[300, 250]],
        context: 'outstream',
        minduration: 1,      // Minimum ad duration, in seconds
        maxduration: 60,     // Maximum ad duration, in seconds
        skip: 0,             // 1 - true, 0 - false
        skipafter: 5,        // Number of seconds before the video can be skipped
        playbackmethod: [2], // Auto-play without sound
        protocols: [1, 2, 3] // VAST 1.0, 2.0 and 3.0
      }
    },
    bids: [
      {
        bidder: 'vibrantmedia',
        params: {
          placementId: 67890,
          video: {
            skippable: true,
            playback_method: 'auto_play_sound_off'
          }
        }
      }
    ]
  },

  // Native ad unit
  {
    code: 'test-native',
    mediaTypes: {
      native: {
        image: {
          required: true,
          sizes: [300, 250]
        },
        title: {
          required: true
        },
        sponsoredBy: {
          required: true
        },
        clickUrl: {
          required: true
        },
      }
    },
    bids: [{
      bidder: 'vibrantmedia',
      params: {
        placementId: 13579,
        allowSmallerSizes: true
      }
    }]
  }
];
```
