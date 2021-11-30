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

```
var adUnits = [
   // Banner ad unit
   {
     code: 'banner-div',
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
           placementId: 23456,
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
      code: 'native',
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
          placementId: 34567,
          allowSmallerSizes: true
        }
      }]
   }
];
```

Call the Prebid Service with this request body to get guaranteed bids for all supported media types:

```
{
    "url": "https://prebidtest.vibrantmedia.com",
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
                    "sizes": [
                        [300, 250]
                    ]
                }
            }
        },
        {
            "code": "video-div",
            "id": "67890",
            "bidder": "vibrantmedia",
            "mediaTypes": {
                "video": {
                    "context": "outstream",
                    "sizes": [
                        [300, 250]
                    ]
                }
            }
        },
        {
            "code": "native-div",
            "id": "13579",
            "bidder": "vibrantmedia",
            "mediaTypes": {
                "native": {
                    "image": {
                        "required": true,
                    "sizes": [
                        [300, 250]
                    ]
                    },
                    "title": {
                        "required": true
                    },
                    "sponsoredBy": {
                        "required": true
                    },
                    "clickUrl": {
                        "required": true
                    }
                }
            }
        }
    ]
}
```
