# Overview

```
Module Name: Sonobi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: apex.prebid@sonobi.com
```

# Description

Module that connects to Sonobi's demand sources.

# Test Parameters
```
  var adUnits = [
    {
      code: 'adUnit_af',
      sizes: [[300, 250], [300, 600]],  // a display size
      bids: [
        {
            bidder: 'sonobi',
            params: {
                ad_unit: '/7780971/sparks_prebid_MR',
                placement_id: '1a2b3c4d5e6f1a2b3c4d', // ad_unit and placement_id are mutually exclusive
                sizes: [[300, 250], [300, 600]],
                floor: 1 // optional
            }
        }
      ]
    }
  ];
```

# Video Test Parameters
```
 var videoAdUnit = {
        code: 'adUnit_af',
        sizes: [640,480],
        mediaTypes: {
          video: {context: 'instream'}
        },
        bids: [
          {
            bidder: 'sonobi',
            params: {
              placement_id: '92e95368e86639dbd86d',
            }
          }
        ]
      };
```

Example bidsBackHandler for video bids
```
pbjs.requestBids({
          timeout : 700,
          bidsBackHandler : function(bids) {
            var videoUrl = pbjs.adServers.dfp.buildVideoUrl({
                adUnit: videoAdUnit,
                params: {
                    cust_params: {
                        hb_vid: bids.adUnit_af.bids[0].creativeId
                    },
                    iu: '/7780971/apex_jwplayer_video'
                }
            });
            invokeVideoPlayer(videoUrl);
          }
        });
```
