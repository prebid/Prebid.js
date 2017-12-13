# Overview

**Module Name**: VertaMedia Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: support@verta.media

# Description

Get access to multiple demand partners across VertaMedia AdExchange and maximize your yield with VertaMedia header bidding adapter.

VertaMedia header bidding adapter connects with VertaMedia demand sources in order to fetch bids.
This adapter provides a solution for accessing display demand


# Test Parameters
```
 var adUnits = [{
        code: 'div-test-div',
        sizes: [[300, 250]], // ad size
        bids: [{
            bidder: 'vertamediadis', // adapter name
            params: {
                aid: 324758
            }
        }]
    }];
```
