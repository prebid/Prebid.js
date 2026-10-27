# Overview

```
Module Name:  Alliance Gravity Bid Adapter
Module Type:  Bidder Adapter
Maintainer: produit@alliancegravity.com
```

# Description

Sends bids to Alliance Gravity network

Alliance Gravity bid adapter supports Banner, Video, Audio and Native formats

# Test Parameters
```javascript
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300,600]]
      }
    },
    bids: [{
        bidder: 'alliance_gravity',
        params: {
          srid: "test-id"
        }
      }]
  },
];
```
