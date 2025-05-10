# Overview

```
Module Name: Invamia Bidder Adapter
Module Type: Bidder Adapter
Maintainer: contact@invamia.com
```

# Description

Module that connects to Invamia demand sources.

# Test Parameters

```
    const adUnits = [{
      code: 'test-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        },
      },
      bids: [{
        bidder: 'invamia',
        params: {
          zoneId: 379783,
        },
      }],
    }];
```
