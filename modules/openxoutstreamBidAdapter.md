# Overview

```
Module Name: OpenX Outstream Bidder Adapter
Module Type: Bidder Adapter
Maintainer: formats@yieldmo.com
```

# Description

Module that connects to OpenX's demand sources for video outstream

# Bid Parameters
## Banner

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `delDomain` | required | String | OpenX delivery domain provided by your OpenX representative.  | "PUBLISHER-d.openx.net"
| `unit` | required | String | OpenX ad unit ID provided by your OpenX representative. | "1611023122"
| `doNotTrack` | optional | Boolean | Prevents advertiser from using data for this user. <br/><br/> **WARNING:**<br/> Request-level setting.  May impact revenue. | true
| `coppa` | optional | Boolean | Enables Child's Online Privacy Protection Act (COPPA) regulations. | true



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
          unit: '53943996499',
          delDomain: 'se-demo-d.openx.net',
          publisher_page_url: 'yieldmo.com',
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

