# Overview

```
Module Name: GumGum Bidder Adapter
Module Type: Bidder Adapter
Maintainer: engineering@gumgum.com
```

# Description

GumGum adapter for Prebid.js
Please note that both video and in-video products require a mediaType of video. 
All other products (in-screen, slot, native) should have a mediaType of banner.


# Test Parameters
```
var adUnits = [
  {
    code: 'test-div',
    sizes: [[300, 250]],
    mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        }
    },
    bids: [
      {
        bidder: 'gumgum',
        params: {
          inSlot: '15901', // GumGum Slot ID given to the client,
          bidfloor: 0.03 // CPM bid floor
        }
      }
    ]
  },{
    code: 'test-div',
    sizes: [[300, 50]],
    mediaTypes: {
        banner: {
          sizes: [[1, 1]],
        }
    },
    bids: [
      {
        bidder: 'gumgum',
        params: {
          inScreen: 'dc9d6be1', // GumGum Zone ID given to the client
          bidfloor: 0.03 // CPM bid floor
        }
      }
    ]
  },{
    code: 'test-div',
    sizes: [[300, 50]],
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        minduration: 1,
        maxduration: 2,
        linearity: 2,
        startdelay: 1,
        placement: 1,
        protocols: [1, 2]
      }
    }
    bids: [
      {
        bidder: 'gumgum',
        params: {
          inVideo: 'ggumtest', // GumGum Zone ID given to the client
          bidfloor: 0.03 // CPM bid floor
        }
      }
    ]
  }
];
```
