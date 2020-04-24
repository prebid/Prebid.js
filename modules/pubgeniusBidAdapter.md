# Overview

```
Module Name: pubGENIUS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: meng@pubgenius.io
```

# Description

Module that connects to pubGENIUS's demand sources

# Test Parameters

```
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],  // a display size
      }
    },
    bids: [
      {
        bidder: 'pubgenius',
        params: {
          placement: '12345'
        }
      }
    ]
  },{
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[320, 50]],   // a mobile size
      }
    },
    bids: [
      {
        bidder: 'pubgenius',
        params: {
          placement: 67890
        }
      }
    ]
  }
];
```

