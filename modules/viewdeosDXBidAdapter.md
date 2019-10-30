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
        sizes: [[640, 480]],
        mediaTypes: {
          video: {
            context: 'instream'
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
        sizes: [[640, 480]],
        mediaTypes: {
          video: {
            context: 'outstream'
          }
        },
        bids: [{
          bidder: 'viewdeosDX',
          params: {
            aid: 331133
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
