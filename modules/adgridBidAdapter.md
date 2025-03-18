# Overview

**Module Name**: AdGrid Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: support@adgrid.io

# Description

The AdGrid Bidding Adapter requires setup and approval before beginning. Please reach out to <support@adgrid.io> for more details.

# Test Parameters

```javascript
var adUnits = [
  // Banner adUnit
  {
    code: 'test-div-1',
    mediaTypes:{
      banner:{
        sizes: [[300, 250]]
      }
    }
    bids: [{
      bidder: 'adgrid',
      params: {
        domainId: 12345
      }
    }]
  },
  {
    code: 'test-div-2',
    mediaTypes:{
      banner:{
        sizes: [[728, 90], [320, 50]]
      }
    }
    bids: [{
      bidder: 'adgrid',
      params: {
        domainId: 67890
      }
    }]
  }
];
```
