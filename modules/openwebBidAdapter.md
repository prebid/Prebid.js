# Overview

**Module Name**: OpenWeb Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: monetization@openweb.com

# Description

OpenWeb.com official prebid adapter. Available in both client and server side versions.
OpenWeb header bidding adapter provides solution for accessing both Video and Display demand.

# Test Parameters
```
    var adUnits = [
      // Banner adUnit
      {
        code: 'div-test-div',
        sizes: [[300, 250]],
        bids: [{
          bidder: 'openweb',
          params: {
            aid: 529814
          }
        }]
      }
    ];
```
