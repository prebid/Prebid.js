# Overview

**Module Name**: Open8 Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  tdd-adtech@open8.com

 # Description

Innity Bidder Adapter for Prebid.js.

# Test Parameters
```
var adUnits = [
  // Banner adUnit
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ],
      }
    },
    bids: [{
      bidder: 'open8',
      params: {
        slotKey: '504c2e89'
      }
    }]
  }, 
  // Video outstream adUnit 
  {
    code: 'video-outstream',
    sizes: [
        [640, 360]
      ],
    mediaTypes: {
      video: {
        context: 'outstream'
      }
    },
    bids: [{
      bidder: 'open8',
      params: {
        slotKey: '2ae5a533'
      }
    }]
  }];

```