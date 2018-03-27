# Overview

**Module Name**: Adtelligent Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: support@adtelligent.com

# Description

Get access to multiple demand partners across Adtelligent Marketplace and maximize your yield with Adtelligent header bidding adapter.

Adtelligent header bidding adapter connects with Adtelligent demand sources in order to fetch bids.
This adapter provides a solution for accessing Video demand and display demand


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
          bidder: 'adtelligent',
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
          bidder: 'adtelligent',
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
          bidder: 'adtelligent',
          params: {
            aid: 350975
          }
        }]
      }
    ];
```
