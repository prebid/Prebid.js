# Overview

```
Module Name: HypeLab Bid Adapter
Module Type: Bidder Adapter
Maintainer: sdk@hypelab.com
```

# Description

Prebid.JS adapter that connects to HypeLab ad network for bids.
*NOTE*: The HypeLab Adapter requires setup and approval before use. Please reach out to `partnerships@hypelab.com` for more details. To get started, replace the `property_slug` with your property_slug and the `placement_slug` with your placement slug to receive bids. The placement slug will depend on the required size and can be set via the HypeLab interface.

# Test Parameters

## Sample Banner Ad Unit

```js
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]],
      },
    },
    bids: [
        {
            bidder: 'hypelab',
            params: {
                property_slug: 'prebid',
                placement_slug: 'test_placement'
            }
        }
    ]
  }
]
```
