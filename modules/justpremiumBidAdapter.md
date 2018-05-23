# Overview

**Module Name**: Justpremium Bidder Adapter

**Module Type**: Bidder Adapter

**Maintainer**: headerbidding-dev@justpremium.com

# Description

To get more information or your unique zone id please contact Justpremium.

# Test Parameters
```

var adUnits = [
  {
    code: 'div-gpt-ad-1471513102552-2',
    mediaTypes: {
      banner: {
        sizes: [[728,90], [468,60]],
      }
    },
    bids: [{
      bidder: 'justpremium',
      params: {
        adType: 'iab',
        zone: 21521
      }
    }]
  },
  {
    code: 'div-gpt-ad-1471513102552-0',
    mediaTypes: {
      banner: {
        sizes: [[1, 1]],
      }
    },
    bids: [
      {
        bidder: 'justpremium',
        params: {
          zone: 34364
        }
      },
    ]
  }
];

```
