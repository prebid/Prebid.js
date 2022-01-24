# Overview

```
Module Name:  Aseal Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   tech-service@aotter.net
```

# Description

Module that connects to Aseal server for bids.
Supported Ad Formats:

- Banner

# Configuration

Following configuration is required:

```js
pbjs.setConfig({
  aseal: {
    clientId: "YOUR_CLIENT_ID"
  }
});
```

# Ad Unit Example

```js
var adUnits = [
  {
    code: "banner-div",
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600]
        ]
      }
    },
    bids: [
      {
        bidder: "aseal",
        params: {
          placeUid: "f4a74f73-9a74-4a87-91c9-545c6316c23d"
        }
      }
    ]
  }
];
```
