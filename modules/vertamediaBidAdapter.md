# Overview

**Module Name**: VertaMedia Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: support@verta.media

# Description

Get access to multiple demand partners across VertaMedia AdExchange and maximize your yield with VertaMedia header bidding adapter.

VertaMedia header bidding adapter connects with VertaMedia demand sources in order to fetch bids.
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
          bidder: 'vertamedia',
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
          bidder: 'vertamedia',
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
          bidder: 'vertamedia',
          params: {
            aid: 350975
          }
        }]
      }
    ];
```
