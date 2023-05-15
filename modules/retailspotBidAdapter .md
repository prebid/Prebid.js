# Overview

Module Name: RetailSpot Bidder Adapter
Module Type: Bidder Adapter
Maintainer: guillaume@retail-spot.io

# Description

Module that connects to RetailSpot demand sources.
Banner and Video ad formats are supported.

# Test Parameters
```
  var adUnits = {
    "code": "test-div",
    "mediaTypes": {
      "banner": {
        "sizes": ["300x250"]
      },
      "video": {
        context: "instream",
        playerSize: [[640, 480]]
      }
    },
    bids: [{
      bidder: "retailspot",
      params: {
        placement: "test-12345"
      }
    }]
  };
```
