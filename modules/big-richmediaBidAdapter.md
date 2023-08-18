# Overview

```
Module Name: BI.Garage Rich Media
Module Type: Bidder Adapter
Maintainer: mediaconsortium-develop@bi.garage.co.jp
```

# Description

Module which renders richmedia demand from a Xandr seat

### Global configuration

```javascript
pbjs.setConfig({
  debug: false,
  // …,
  bigRichmedia: {
    publisherId: 'A7FN99NZ98F5ZD4G', // Required
  },
});
```

# AdUnit Configuration
```javascript
var adUnits = [
   // Skin adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]]
        }
      },
      bids: [{
         bidder: 'big-richmedia',
         params: {
           placementId: 12345,
           format: 'skin' // This will automatically add 1800x1000 size to banner mediaType
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
         bidder: 'big-richmedia',
         params: {
           placementId: 12345,
           video: {
             skippable: true,
             playback_method: 'auto_play_sound_off'
           },
           format: 'video-sticky-footer', // or 'video-sticky-top'
           isReplayable: true // Default to false - choose if the video should be replayable or not. 
           customSelector: '#nav-bar' // custom selector for navbar
         }
       }
     ]
   }
];
```
