# Overview

```
Module Name: Optable Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@optable.co
```

# Description

Module that connects to Optable's demand sources.

# Bid Parameters
## Banner

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `site` | required | String | Optable site ID provided by your Optable representative. | "aaaaaaaa"

## Video

Not supported at the moment.

# Example
```javascript
var adUnits = [
  {
    code: 'test-div',
    sizes: [[728, 90]],  // a display size
    mediaTypes: {'banner': {}},
    bids: [
      {
        bidder: 'optable',
        params: {
          site: 'aaaaaaaa',
        },
      },
    ],
  },
];
```
