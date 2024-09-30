# Overview

Module Name: C1X Bidder Adapter
Module Type: Bidder Adapter
Maintainer: vishnu@c1exchange.com

# Description

Module that connects to C1X's demand sources

# Test Parameters
```
  var adUnits = [{
    code: 'test-div-1',
    mediaTypes: {
        banner: {
            sizes: [[750, 200]],
        }
    },
    bids: [{
        bidder: 'c1x',
        params: {
            placementId: 'div-gpt-ad-1654594619717-0',
            'floorPriceMap': {
                    '300x250': 4.35
            }
        }
    }]
  }, {
    code: 'test-div-2',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [750, 200]],
        }
    },
    bids: [{
        bidder: 'c1x',
        params: {
            placementId: 'div-gpt-ad-1654940683355-0',
            'floorPriceMap': {
                    '300x250': 4.35
            }
            dealId: '1233' // optional parameter
        }
    }]
  }];


  pbjs.bidderSettings = {
    c1x: {
      siteId: 999,
      adserverTargeting: [{
          key: "hb_bidder",
          val: function(bidResponse) {
              return bidResponse.bidderCode;
          }
      }, {
          key: "hb_adid",
          val: function(bidResponse) {
              return bidResponse.adId;
          }
      }, {
          key: "hb_pb",
          val: function(bidResponse) {
              return bidResponse.pbLg;
          }
      }]
    }
  }
```