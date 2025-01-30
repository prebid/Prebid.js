# Overview

```
Module Name: iMedia Digital Services Bidder Adapter
Module Type: Bidder Adapter
Maintainer: eng-demand@imds.tv
```

# Description

The iMedia Digital Services adapter requires setup and approval from iMedia Digital Services.
Please reach out to your account manager for more information.

### Google Ad Manager Video Creative
To use video, setup a `VAST redirect` creative within Google Ad Manager with the following VAST tag URL:

```text
https://track.technoratimedia.com/openrtb/tags?ID=%%PATTERN:hb_uuid_imds%%&AUCTION_PRICE=%%PATTERN:hb_pb_imds%%
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
          bidder: "imds",
          params: {
              seatId: "prebid",
              tagId: "demo1",
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
          bidder: "imds",
          params: {
              seatId: "prebid",
              tagId: "demo1",
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
