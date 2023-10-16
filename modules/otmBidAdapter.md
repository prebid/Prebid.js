# Overview

**Module Name**: OTM Bidder Adapter
**Module Type**: Bidder Adapter  
**Maintainer**: e.kretsu@otm-r.com

# Description

OTM Bidder Adapter for Prebid.js. About: https://otm-r.com

Use `otm` as bidder:

# Params
- `tid` required, specific id AdUnit slot.
- `domain` optional, specific custom domain.
- `bidfloor` optional.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot', //use exactly the same code as your slot div id.
      mediaTypes: {
          banner: {
              sizes: [[320, 480]]
          }
      },
      bids: [{
        bidder: 'otm',
        params: { 
            tid: 'XXXXX',
            domain: 'specific custom domain, if needed',
            bidfloor: 20
        }
      }]
    }];

```
