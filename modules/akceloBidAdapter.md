# Overview

**Module Name**: Akcelo Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: tech@akcelo.io

# Description

A module that connects to the Akcelo network for bids

## AdUnits configuration example

```javascript
const adUnits = [
  {
    code: 'div-123',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
      video: {
        context: "outstream",
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6, 7, 8],
        playbackmethod: [1],
        skip: 1,
        api: [2],
        minbitrate: 1000,
        maxbitrate: 3000,
        minduration: 3,
        maxduration: 10,
        startdelay: 2,
        placement: 4,
        linearity: 1
      },
    },
    bids: [
      {
        bidder: 'akcelo',
        params: {
          siteId: 763, // required
          adUnitId: 7965, // required
          test: 1, // optional, use 0 to disable test creatives
        },
      },
    ],
  },
];

pbjs.que.push(function () {
  pbjs.addAdUnits(adUnits);
});
```
