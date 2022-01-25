# Overview

```
Module Name:  Clean Media Net Adapter
Module Type:  Bidder Adapter
Maintainer:   dev@cleanmedia.net
```

# Description

Connects to Clean Media Net's Programmatic advertising platform as a service.

Clean Media bid adapter supports Banner & Video (Instream and Outstream).
The *only* required parameter (in the `params` section) is the `supplyPartnerId` parameter.

# Test Parameters
```
var adUnits = [
    // Banner adUnit
   {
     code: 'banner-div',
     sizes: [[300, 250]],
     bids: [{
       bidder: 'cleanmedianet',
       params: {
          // ID of the supply partner you created in the Clean Media Net dashboard
         supplyPartnerId: '1253',
          // OPTIONAL: custom bid floor
         bidfloor: 0.01,
          // OPTIONAL: if you know the ad position on the page, specify it here
         //           (this corresponds to "Ad Position" in OpenRTB 2.3, section 5.4)
         //adpos: 1,
          // OPTIONAL: whether this is an interstitial placement (0 or 1)
         //           (see "instl" property in "Imp" object in the OpenRTB 2.3, section 3.2.2)
         //instl: 0
       }
     }]
   },
    // Video outstream adUnit
   {
     code: 'video-outstream',
     sizes: [[300, 250]],
     mediaTypes: {
       video: {
         context: 'outstream',
         playerSize: [300, 250]
       }
     },
     bids: [ {
       bidder: 'cleanmedianet',
       params: {
          // ID of the supply partner you created in the dashboard
         supplyPartnerId: '1254',
          // OPTIONAL: custom bid floor
         bidfloor: 0.01,
          // OPTIONAL: if you know the ad position on the page, specify it here
         //           (this corresponds to "Ad Position" in OpenRTB 2.3, section 5.4)
         //adpos: 1,
          // OPTIONAL: whether this is an interstitial placement (0 or 1)
         //           (see "instl" property in "Imp" object in the OpenRTB 2.3, section 3.2.2)
         //instl: 0
       }
     }]
   }
];
```
