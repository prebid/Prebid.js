# Overview

**Module Name**: VertaMedia Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: support@verta.media

# Description

Get access to multiple demand partners across VertaMedia AdExchange and maximize your yield with VertaMedia header bidding adapter.

VertaMedia header bidding adapter connects with VertaMedia demand sources in order to fetch bids.
This adapter provides a solution for accessing Video demand


# Test Parameters
```
 var adUnits = [{
        code: 'div-test-div',
        sizes: [[640, 480]], // ad size
        bids: [{
            bidder: 'vertamedia', // adapter name
            params: {
                aid: 332842
            }
        }]
    }{
        code: 'outstream-test-div',
        sizes: [[640, 480]], // ad size
        mediaTypes: {
            video: {
                context: 'outstream'
            }
        },
        bids: [{
            bidder: 'vertamedia', // adapter name
            params: {
                aid: 332842
            }
        }]
    }];
```
