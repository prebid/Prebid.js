# Overview

**Module Name**: Innity Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  engtat@innity.com

 # Description

Innity Bidder Adapter for Prebid.js.

# Test Parameters
```
    var adUnits = [{
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