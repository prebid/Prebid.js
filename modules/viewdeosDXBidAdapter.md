# Overview

**Module Name**: Viewdeos DX Bidder Adapter
**Module Type**: Bidder Adapter

# Description

Get access to multiple demand partners across Viewdeos and maximize your yield with Viewdeos header bidding adapter.

# Test Parameters
```
    var adUnits = [

      // Video instream adUnit
      {
        code: 'div-test-div',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [[640, 480]]
          }
        },
        bids: [{
          bidder: 'viewdeosDX',
          params: {
            aid: 331133
          }
        }]
      },

      // Video outstream adUnit
      {
        code: 'outstream-test-div',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 480]]
          }
        },
        bids: [{
          bidder: 'viewdeosDX',
          params: {
            aid: 331133,
            outstream: {
                default_volume:50,
                video_controls:'show'
            }
          }
        }]
      },

      // Banner adUnit
      {
        code: 'div-test-div',
        sizes: [[300, 250]],
        bids: [{
          bidder: 'viewdeosDX',
          params: {
            aid: 350975
          }
        }]
      }
    ];
```
