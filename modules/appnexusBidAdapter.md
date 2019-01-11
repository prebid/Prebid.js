# Overview

```
Module Name:  Appnexus Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@prebid.org
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
      }
      bids: [{
         bidder: 'appnexus',
         params: {
           placementId: '10433394'
         }
       }]
   },
   // Native adUnit
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
            required: true
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
   // Video instream adUnit
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
   // Video outstream adUnit
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
         placementId: '10433394',
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
