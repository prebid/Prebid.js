# Yaleo Bid Adapter

# Overview

```
Module name: Yaleo Bid Adapter
Module Type: Bidder Adapter
Maintainer: alexandr.kim@audienzz.com
```

# Description

Module that connects to Yaleo's demand sources.

**Note:** the bid adapter requires correct setup and approval. For more information visit [yaleo.com](https://www.yaleo.com) or contact [hola@yaleo.com](mailto:hola@yaleo.com).

# Test parameters

**Note:** to receive test bids without proper integration with the demand source, add `yaleo_test=true` to the page URL (e.g. `https://example.com/page?yaleo_test=true`). The adapter then sends the bid request with the OpenRTB `test: 1` flag, and the endpoint answers with test bids. Setting `test: 1` in the first party data with `pbjs.setConfig({ ortb2: { test: 1 } })` works too, but marks the request as test traffic for every bidder.

```js
const adUnits = [
  {
    code: "test-div-1",
    mediaTypes: {
      banner: {
        sizes: [[300, 300], [300, 600]],
      }
    },
    bids: [{
      bidder: "yaleo",
      params: {
        placementId: "9c752583-d856-4b44-a227-c0ce6c7a8cfa",
      }
    }]
  }
];
```

