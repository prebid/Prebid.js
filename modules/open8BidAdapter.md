# Overview

**Module Name**: Innity Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  engtat@innity.com

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
        slotId: 4
      }
    }]
  }, 
  // Video outstream adUnit 
  {
    code: 'video-outstream',
    sizes: [[300, 250]],
    mediaTypes: {
      video: {
        context: 'outstream'
      }
    },
    bids: [{
      bidder: 'open8',
      params: {
        slotId: 2
      }
    }]
  }];

```