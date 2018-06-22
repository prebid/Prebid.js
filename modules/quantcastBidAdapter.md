# Overview

```
Module Name: Quantcast Bidder Adapter
Module Type: Bidder Adapter
Maintainer: igor.soarez@quantcast.com
```

# Description

Module that connects to Quantcast demand sources to fetch bids.

# Test Parameters

```js
const adUnits = [{
  code: 'banner',
  sizes: [
    [300, 250]
  ],
  bids: [
    {
      bidder: 'quantcast',
      params: {
        publisherId: 'test-publisher', // REQUIRED - Publisher ID provided by Quantcast
        battr: [1, 2] // OPTIONAL - Array of blocked creative attributes as per OpenRTB Spec List 5.3
      }
    }
  ]
}];
```
