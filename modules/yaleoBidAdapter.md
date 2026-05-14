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

**Note:** to receive bids when testing without proper integration with the demand source, enable Prebid.js debug mode. See [how to enable debug mode](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#debugging) for details.

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
        placementId: "95a09f24-afb8-441c-977b-08b4039cb88e",
      }
    }]
  }
];
```

