# Overview

```
Module Name: Vibrant Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kormorantdev@vibrantmedia.com
```

# Description

Module that allows Kormorant to perform bids and return ad unit details.

This adapter supports Banner, Native and Video (outstream only).

# Test Parameters

Use these parameters, emulating a Vibrant Prebid Service response, to test the adapter:

```
var adUnits = [
   // Banner adUnit
   // See https://developers.google.com/authorized-buyers/rtb/openrtb-guide#banner
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]]
        }
      },
      bids: [{
         bidder: 'vibrantmedia',
         params: {
           placementId: 13144370
         }
       }]
   },
   // Native adUnit
   // See https://developers.google.com/authorized-buyers/rtb/openrtb-guide#native
   {
      code: 'native',
      sizes: [[1, 1]],
      mediaTypes: {
        native: {
          title: {
            required: true
          },
          body: {
            required: true
          },
          image: {
            required: true
          },
          sponsoredBy: {
            required: true
          },
          icon: {
            required: false
          }
        }
      },
      bids: [{
        bidder: 'vibrantmedia',
        params: {
          placementId: 13232354,
          allowSmallerSizes: true
        }
      }]
   },
   // Video outstream adUnit
   // See https://developers.google.com/authorized-buyers/rtb/openrtb-guide#video
   {
     code: 'video-outstream',
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
           placementId: 13232385,
           video: {
             skippable: true,
             playback_method: 'auto_play_sound_off'
           }
         }
       }
     ]
   },
   // Banner adUnit in a App Webview
   // Only use this for situations where prebid.js is in a webview of an App
   // See Prebid Mobile for displaying ads via an SDK
   {
     code: 'banner',
     mediaTypes: {
       banner: {
         sizes: [[300, 250], [300,600]]
       }
     }
     bids: [{
       bidder: 'vibrantmedia',
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
