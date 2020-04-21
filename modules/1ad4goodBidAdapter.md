# Overview

```
Module Name:  1ad4good Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@1ad4good.org
```

# Description

Connects to 1ad4good exchange for bids.

1ad4good bid adapter supports Banner and Video (instream).

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]]
        }
      },
      bids: [{
         bidder: '1ad4good',
         params: {
           placementId: 13144370
         }
       }]
   },
   // Video instream adUnit
   {
      code: 'video-instream',
      sizes: [[640, 480]],
      mediaTypes: {
        video: {
          playerSize: [[640, 480]],
          context: 'instream'
        },
      },
      bids: [{
        bidder: '1ad4good',
        params: {
          placementId: 13232361,
          video: {
            skippable: true,
            playback_methods: ['auto_play_sound_off']
          }
        }
      }]
   },

   // Banner adUnit in a App Webview
   // Only use this for situations where prebid.js is in a webview of an App
   // See Prebid Mobile for displaying ads via an SDK
   {
     code: 'banner-div',
     mediaTypes: {
       banner: {
         sizes: [[300, 250], [300,600]]
       }
     }
     bids: [{
       bidder: '1ad4good',
       params: {
         placementId: 13144370,
         app: {
           id: "B1O2W3M4AN.com.prebid.webview",
           geo: {
             lat: 40.0964439,
             lng: -75.3009142
           },
           device_id: {
             idfa: "4D12078D-3246-4DA4-AD5E-7610481E7AE", // Apple advertising identifier
             aaid: "38400000-8cf0-11bd-b23e-10b96e40000d", // Android advertising identifier
             md5udid: "5756ae9022b2ea1e47d84fead75220c8", // MD5 hash of the ANDROID_ID
             sha1udid: "4DFAA92388699AC6539885AEF1719293879985BF", // SHA1 hash of the ANDROID_ID
             windowsadid: "750c6be243f1c4b5c9912b95a5742fc5" // Windows advertising identifier
           }
         }
       }
     }]
   }
];
```
