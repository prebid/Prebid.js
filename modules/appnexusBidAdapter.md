# Overview

```
Module Name:  Appnexus Bid Adapter
Module Type:  Bidder Adapter
Maintainer: prebid-js@xandr.com
```

# Description

Connects to Appnexus exchange for bids.

Appnexus bid adapter supports Banner, Video (instream and outstream) and Native.

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
         bidder: 'appnexus',
         params: {
           placementId: 13144370
         }
       }]
   },
   // Native adUnit
   {
      code: 'native-div',
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
        bidder: 'appnexus',
        params: {
          placementId: 13232354,
          allowSmallerSizes: true
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
        bidder: 'appnexus',
        params: {
          placementId: 13232361,
          video: {
            skippable: true,
            playback_methods: ['auto_play_sound_off']
          }
        }
      }]
   },
   // Video outstream adUnit
   {
     code: 'video-outstream',
     sizes: [[300, 250]],
     mediaTypes: {
       video: {
         playerSize: [[300, 250]],
         context: 'outstream',
         // Certain ORTB 2.5 video values can be read from the mediatypes object; below are examples of supported params.
         // To note - appnexus supports additional values for our system that are not part of the ORTB spec.  If you want
         // to use these values, they will have to be declared in the bids[].params.video object instead using the appnexus syntax.
         // Between the corresponding values of the mediaTypes.video and params.video objects, the properties in params.video will 
         // take precedence if declared; eg in the example below, the `skippable: true` setting will be used instead of the `skip: 0`.
         minduration: 1,
         maxduration: 60,
         skip: 0,   // 1 - true, 0 - false
         skipafter: 5,
         playbackmethod: [2], // note - we only support options 1-4 at this time
         api: [1,2,3]   // note - option 6 is not supported at this time
       }
     },
     bids: [
       {
         bidder: 'appnexus',
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
     code: 'banner-div',
     mediaTypes: {
       banner: {
         sizes: [[300, 250], [300,600]]
       }
     }
     bids: [{
       bidder: 'appnexus',
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
