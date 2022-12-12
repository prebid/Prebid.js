# Overview

```
Module Name: YIELDONE Bidder Adapter
Module Type: Bidder Adapter
Maintainer: y1dev@platform-one.co.jp
```

# Description

Connect to YIELDONE for bids.

THE YIELDONE adapter requires setup and approval from the YIELDONE team.
Please reach out to your account team or y1s@platform-one.co.jp for more information.

YIELDONE adapter supports Banner, Video and Multi-Format(video, banner) currently.

# Test Parameters
```javascript
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [336, 280]
          ]
        }
      },
      bids: [{
         bidder: 'yieldone',
         params: {
           placementId: '36891'  // required
         }
       }]
   },
   // Video adUnit
   {
      code: 'video-div',
      mediaTypes: {
        video: {
          playerSize: [[640, 480]],
          context: 'outstream'
        },
      },
      bids: [{
        bidder: "yieldone",
        params: {
          placementId: "36892",     // required
          playerParams: {           // optional
            wrapperWidth: "320px",  // optional
            wrapperHeight: "180px"  // optional
          },
        }
      }]
   },
   // Video adUnit(mediaTypes.video.playerSize: [1,1])
   {
      code: 'video-1x1-div',
      mediaTypes: {
        video: {
          playerSize: [[1, 1]],
          context: 'outstream'
        },
      },
      bids: [{
        bidder: 'yieldone',
        params: {
          placementId: "36892",     // required
          playerSize: [640, 360],   // required
          playerParams: {           // optional
            wrapperWidth: "320px",  // optional
            wrapperHeight: "180px"  // optional
          },
        }
      }]
   },
   // Multi-Format adUnit
   {
      code: "multi-format-div",
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [1, 1]
          ]
        },
        video: {
          playerSize: [640, 360],
          context: "outstream"
        }
      },
      bids: [{
        // * "video" bid object should be placed before "banner" bid object.
        // This bid will request a "video" media type ad.
        bidder: "yieldone",
        params: {
          placementId: "36892",     // required
          playerParams: {           // required
            wrapperWidth: "320px",  // optional
            wrapperHeight: "180px"  // optional
          },
        }
      },
      {
        // This bid will request a "banner" media type ad.
        bidder: "yieldone",
        params: {
          placementId: "36891"  // required
        }
      }
    ]
   },
   // Multi-Format adUnit(mediaTypes.video.playerSize: [1,1])
   {
      code: "multi-format-1x1-div",
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [1, 1]
          ]
        },
        video: {
          playerSize: [1, 1],
          context: "outstream"
        }
      },
      bids: [{
        // * "video" bid object should be placed before "banner" bid object.
        // This bid will request a "video" media type ad.
        bidder: "yieldone",
        params: {
          placementId: "36892",     // required
          playerSize: [640, 360],   // required
          playerParams: {           // required
            wrapperWidth: "320px",  // optional
            wrapperHeight: "180px"  // optional
          },
        }
      },
      {
        // This bid will request a "banner" media type ad.
        bidder: "yieldone",
        params: {
          placementId: "36891"  // required
        }
      }
    ]
   }
```

### Configuration

YIELDONE recommends the UserSync configuration below.  Without it, the YIELDONE adapter will not able to perform user syncs, which lowers match rate and reduces monetization.

```javascript
pbjs.setConfig({
   userSync: {
    iframeEnabled: true,
    enabledBidders: ['yieldone']
 }});
```
