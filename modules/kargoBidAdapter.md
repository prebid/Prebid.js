# Overview

**Module Name**: Kargo Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: kraken@kargo.com

# Description

Please use `kargo` as the bidder code. Also, you *must* test on a mobile device, or emulate a mobile device by manipulating the user agent string sent to the server.

# Test Parameters
```
  var adUnits = [{
    code: 'div-gpt-ad-1460505748561-1',
    sizes: [[300,250],[1,1]],
    bids: [{
      bidder: 'kargo',
      params: {
        placementId: '_m1Xt2E5dez'
      }
    }]
  },{
    code: 'div-gpt-ad-video-1',
    sizes: [[640,480]],
    mediaTypes: {
      video: {
        playerSize: [640, 480],
        context: 'instream'
      }
    },
    bids: [{
      bidder: 'kargo',
      params: {
        placementId: '_bLIt2QMYee',
        video: {
          skipppable: true,
          playback_method: ['auto_play_sound_off'],
          mimes: ['video/mp4']
        }
      }
    }]
  }];
```
