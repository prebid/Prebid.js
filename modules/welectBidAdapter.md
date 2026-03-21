# Overview

```
Module Name: Welect Bidder Adapter
Module Type: Welect Adapter
Maintainer: dev@welect.de
```

# Description

Module that connects to Welect's demand sources

# Test Parameters
```
var adUnits = [
  {
    bidder: 'welect',
    params: {
      placementId: 'exampleId',
    },
    sizes: [[640, 360]],
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480]
      }
    },
  };
];
```