# Overview

```
Module Name:  Yieldmo Bid Adapter
Module Type:  Bidder Adapter
Maintainer: opensource@yieldmo.com
Note: Our ads will only render in mobile
```

# Description

Connects to Yieldmo Ad Server for bids.

Yieldmo bid adapter supports Banner and Video.

# Test Parameters

## Banner

Sample banner ad unit config:
```javascript
var adUnits = [{ // Banner adUnit
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]],
    }
  },
  bids: [{
    bidder: 'yieldmo',
    params: {
      placementId: '1779781193098233305', // string with at most 19 characters (may include numbers only)
      bidFloor: .28, // optional param
      lr_env: '***' // Optional. Live Ramp ATS envelope
    }
  }]
}];
```

## Video

Sample instream video ad unit config:
```javascript
var adUnits = [{ // Video adUnit
  code: 'div-video-ad-1234567890',
  mediaTypes: {
    video: {
      playerSize: [640, 480], // required
      context: 'instream',
      mimes: ['video/mp4']    // required, array of strings
    }
  },
  bids: [{
    bidder: 'yieldmo',
    params: {
      placementId: '1524592390382976659', // required
      video: {
        placement: 1,       // required, integer
        maxduration: 30,    // required, integer
        minduration: 15,    // optional, integer
        pos: 1,             // optional, integer
        startdelay: 10,     // required if placement == 1
        protocols: [2, 3],  // required, array of integers
        api: [2, 3],        // required, array of integers
        playbackmethod: [2,6], // required, array of integers
        skippable: true,    // optional, boolean
        skipafter: 10       // optional, integer
      },
      lr_env: '***' // Optional. Live Ramp ATS envelope
    }
  }]
}];
```

Sample out-stream video ad unit config:
```javascript
var videoAdUnit = [{
  code: 'div-video-ad-1234567890',
  mediaTypes: {
      video: {
          playerSize: [640, 480],   // required
          context: 'outstream',
          mimes: ['video/mp4']      // required, array of strings
      }
  },
  bids: [{
    bidder: 'yieldmo',
    params: {
      placementId: '1524592390382976659',  // required
      video: {
        placement: 3,                      // required, integer ( 3,4,5 )
        maxduration: 30,                   // required, integer
        protocols: [2, 3],                 // required, array of integers
        api: [2, 3],                       // required, array of integers
        playbackmethod: [1,2]              // required, array of integers
      },
      lr_env: '***' // Optional. Live Ramp ATS envelope
    }
  }]
}];
```

Please also note, that we support the following OpenRTB params:
'mimes', 'startdelay', 'placement', 'startdelay', 'skipafter', 'protocols', 'api',
'playbackmethod', 'maxduration', 'minduration', 'pos', 'skip', 'skippable'.
They can be specified in `mediaTypes.video` or in `bids[].params.video`.
