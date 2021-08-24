# Overview

```
Module Name:  Target Video Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   grajzer@gmail.com
```

# Description

Connects to Appnexus exchange for bids.

TargetVideo bid adapter supports Video (instream and outstream).

# Test Parameters
```
var adUnits = [
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
        bidder: 'targetVideo',
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
         bidder: 'targetVideo',
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
