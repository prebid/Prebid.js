# Overview

```
Module Name: Taboola Adapter
Module Type: Bidder Adapter
Maintainer: prebid@taboola.com
```

# Description

Module that connects to Taboola bidder to fetch bids.
- Supports `display` format
- Uses `OpenRTB` standard

The Taboola Bidding adapter requires setup before beginning. Please contact us on prebid@taboola.com

# Test Display Parameters
``` javascript
 var adUnits = [{
  code: 'your-unit-container-id',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300,600]]
    }
  },
  bids: [{
    bidder: 'taboola',
    params: {
      tagId: 'tester-placement', // Placement Name
      publisherId: 'tester-pub', // your-publisher-id
      bidfloor: 0.25, // Optional - default is null
      bcat: ['IAB1-1'], // Optional - default is []
      badv: ['example.com']  // Optional - default is []
    }
  }]
}];
```

# Parameters

| Name           | Scope    | Description                                             | Example                    | Type         |
|----------------|----------|---------------------------------------------------------|----------------------------|--------------|
| `tagId`        | required | Tag ID / Placement Name <br>(as provided by Taboola)    | `'Below The Article'`      | `String`     |
| `publisherId`  | required | Alphabetic Publisher ID <br>(as provided by Taboola)    | `'acme-publishing'`        | `String`     |
| `bcat`         | optional | List of blocked advertiser categories (IAB)             | `['IAB1-1']`               | `Array`      |
| `badv`         | optional | Blocked Advertiser Domains                              | `'example.com'`            | `String Url` |
| `bidfloor`     | optional | CPM bid floor                                           | `0.25`                     | `Integer`    |


