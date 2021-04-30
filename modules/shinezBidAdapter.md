# Overview

```
Module Name: Shinez Bidder Adapter
Module Type: Bidder Adapter
Maintainer:  tech-team@shinez.io
```

# Description

Connects to shinez.io demand sources.

The Shinez adapter requires setup and approval from the Shinez team.
Please reach out to tech-team@shinez.io for more information.
 
# Test Parameters

```javascript
var adUnits = [{
  code: "test-div",
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: "shinez",
    params: {
      placementId: "00654321"
    }
  }]
}];
```