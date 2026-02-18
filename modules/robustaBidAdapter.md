# Overview

Module Name: Robusta Bid Adapter
Module Type: Bidder Adapter
Maintainer: dev@robustadigital.com

# Description

Connects to Robusta's demand sources to fetch bids.
Please use `robusta` as the bidder code.

# Bid Params

| Name | Scope | Description | Example | Type |
|------|--------|-------------|---------|------|
| lineItemId | Required | The Line Item ID | `'123'` | `string` |

# Example Ad Unit Config

```javascript
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'robusta',
      params: {
        lineItemId: '323bfac4-a3cb-40e8-a3ae-e9832b35f969'
      }
    }]
  }
];
```

# User Sync

Robusta bid adapter supports both iframe and image-based user syncing. Configuration example:

```javascript
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: {
        bidders: ['robusta'],
        filter: 'include'
      },
      image: {
        bidders: ['robusta'],
        filter: 'include'
      }
    }
  }
});
```

# Additional Configuration

The adapter supports custom RTB and sync domains through Prebid.js configuration:

```javascript
pbjs.setBidderConfig({
    bidders: ['robusta'],
    config: {
        rtbDomain: 'custom.rtb.domain.com',   // Optional: Override default RTB domain
        syncDomain: 'custom.sync.domain.com'   // Optional: Override default sync domain
    }
});
```

Default domains:
- RTB Domain: pbjs.baristartb.com
- Sync Domain: sync.baristartb.com