# Overview

```
Module Name: Synacor Media Bidder Adapter
Module Type: Bidder Adapter
Maintainer: eng-demand@synacor.com
```

# Description

The Synacor Media adapter requires setup and approval from Synacor.
Please reach out to your account manager for more information.

### DFP Video Creative
To use video, setup a `VAST redirect` creative within Google AdManager (DFP) with the following VAST tag URL:

```
https://track.technoratimedia.com/openrtb/tags?ID=%%PATTERN:hb_cache_id_synacorm%%&AUCTION_PRICE=%%PATTERN:hb_pb_synacormedia%%
```

# Test Parameters

## Web
```
  var adUnits = [{
      code: 'test-div',
      mediaTypes: {
          banner: {
              sizes: [[300, 250]]
          }
      },
      bids: [{
          bidder: "synacormedia",
          params: {
              seatId: "prebid",
              placementId: "demo1",
              bidfloor: 0.10,
              pos: 1
          }
      }]
  },{
      code: 'test-div2',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [
            [300, 250]
          ],
        }
      },
      bids: [{
          bidder: "synacormedia",
          params: {
              seatId: "prebid",
              placementId: "demo1",
              bidfloor: 0.20,
              pos: 1,
              video: {
                minduration: 15,
                maxduration: 30,
                startdelay: 1,
                linearity: 1
              }
          }
      }]
    }];
```
