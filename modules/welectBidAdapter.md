# Overview

```
Module Name: Welect Bidder Adapter
Module Type: Welect Adapter
Maintainer: nick.duitz@9elements.com
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
      domain: 'www.welect.de'
    },
    sizes: [[640, 360]],
    mediaTypes: {
      video: {
        context: 'instream'
      }
    },
  };
];
```