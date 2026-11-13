# JJTech Bid Adapter

# Overview

```
Module name: JJTech Bid Adapter
Module Type: Bidder Adapter
Maintainer: bhavin@jambojar-tech.com
```

# Description

Module that connects publishers to JJTech's (Jambojar Technologies) demand sources
over OpenRTB 2.6. Supports the banner media type.

Publishers need a JJTech account and a `placementId` per ad unit. Contact
bhavin@jambojar-tech.com to get set up.

# Test parameters

```js
const adUnits = [
  {
    code: 'test-div-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]],
      },
    },
    bids: [
      {
        bidder: 'jjtech',
        params: {
          placementId: 'test-placement-1',
        },
      },
    ],
  },
];
```
