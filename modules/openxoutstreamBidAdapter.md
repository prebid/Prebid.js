# Overview

```
Module Name: OpenX Outstream Bidder Adapter
Module Type: Bidder Adapter
Maintainer: opensource@yieldmo.com, jimmy.tu@openx.com
Note: Ads will only render in mobile
```

# Description

Module that connects to OpenX's demand sources for outstream to Yieldmo.

This bid adapter supports Banner.

# Example
```javascript
var adUnits = [
  {
    code: 'test-div',
    sizes: [[300, 250]],  // a display size
    mediaTypes: {'banner': {}},
    bids: [
      {
        bidder: 'openxoutstream',
        params: {
          unit: '540141567',
          delDomain: 'se-demo-d.openx.net',
          width:  '300',
          height: '250',
        }
      }
    ]
  }
];
```

# Additional Details
[Banner Ads](https://docs.openx.com/Content/developers/containers/prebid-adapter.html)

