# Overview

```
Module Name: Allox Bidder Adapter
Module Type: Bidder Adapter
Maintainer: mi-allox-devbot@ml.nttdocomo.com
```

# Description
Connect to Allox for bids.
Allox bid adapter supports Banner.
The Allox bidding adapter requires setup and approval before use. Please contact mi-allox-devbot@ml.nttdocomo.com for more details.

# Test Parameters

```js
var adUnits = [
  // Banner adUnit
  {
    code: "test-banner-code",
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: "allox",
        params: {
          placementId: "examplePlacementId", // required
        },
      },
    ],
  },
];
```

# Configuration

Access to local storage is required for Allox's Prebid adapter. Ensure that local storage access is enabled; otherwise, the adapter may not function properly.
```js
pbjs.bidderSettings = {
    allox: {
        storageAllowed: true
    }
};
```

# Modules to include in your build process

When running the build command, include `alloxBidAdapter` as a module, as well as `alloxAnalyticsAdapter`.

If a JSON file is being used to specify the bidder modules, add `"alloxBidAdapter"`
to the top-level array in that file.

```json
[
    "alloxBidAdapter",
    "alloxAnalyticsAdapter",
    "fooBidAdapter",
    "bazBidAdapter"
]
```

And then build.

```
gulp build --modules=modules.json
```

# Notes
- Allox will return a test-bid if "allox_test=true" is present in page URL
