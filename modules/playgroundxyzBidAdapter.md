# Overview

```
Module Name:  Appnexus Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@prebid.org
```

# Description

Connects to playgroundxyz ad server for bids.

Appnexus bid adapter supports Banner, Video (instream and outstream).

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div',
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'playgroundxyz',
         params: {
           placementId: '10433394'
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
        bidder: 'playgroundxyz',
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
         bidder: 'playgroundxyz',
         params: {
           placementId: '5768085',
           video: {
             skippable: true,
             playback_method: ['auto_play_sound_off']
           }
         }
       }
     ]
   }
];
```
