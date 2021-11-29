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
   }
];
```

Use these parameters, emulating a Prebid Service request, to call the Prebid Service and get guaranteed bids:

```
{
    "url": "http://prebidtest.vibrantmedia.com",
    "gdpr": {
        "consentString": "CO4fdqYO4fdqYAKAKAENA0CsAP_AAH_AAAwIGYtd_X9fb2vj-_5999t0eY1f9_63v-wzjgeNs-8NyZ_X_L4Xr2MyvB34pq4KmR4Eu3LBAQVlHGHcTQmQwIkVqTLsak2Mq7NKJ7JEilMbM2dYGG1Pn8XTuZCY70_sf__z_3-_-___67YGXkEmGpfAQJCWMBJNmlUKIEIVxIVAOACihGFo0sNCRwU7K4CPUACABAYgIwIgQYgoxZBAAAAAElEQAkAwIBEARAIAAQArQEIACJAEFgBIGAQACoGhYARRBKBIQZHBUcogQFSLRQTzRgAA.f_gAAAAAAAAA", 
        "vendorData": {}, 
        "gdprApplies": false
    },
    "window": {
        "width": 1900,
        "height": 768
    },
    "biddata": [
        {
            "code": "banner-div",
            "id": "12345",
            "bidder": "vibrantmedia",
            "mediaTypes": {
                "banner": {
                    "sizes": [[300, 250]]
                }
            }
        },
        {
            "code": "video-div",
            "id": "67890",
            "bidder": "vibrantmedia",
            "mediaTypes": {
                "banner": {
                    "sizes": [[300, 250]]
                }
            }
        }
    ]
}
```
