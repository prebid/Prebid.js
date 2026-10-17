# Overview

```
Module Name: Pigeoon Bid Adapter
Module Type: Bidder Adapter
Maintainer: destek@pigeoon.com
```

# Description

Pigeoon is an advertising technology platform that connects publishers with advertisers. The Pigeoon bid adapter lets publishers receive bids from Pigeoon through Prebid.js.

Supported media types: banner.

The adapter uses Prebid's OpenRTB converter, so publisher first-party data (site, device, `ortb2Imp`), user IDs (e.g. SharedID), GPID, price floors and consent signals are passed to Pigeoon when they are configured in Prebid.

# Parameters

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `networkId` | required | Publisher network ID provided by Pigeoon | `"net_ABC123"` | string |
| `placementId` | required | Placement ID provided by Pigeoon | `"12345678"` | string |

# User Sync

Pigeoon uses iframe user syncs. To enable them:

```javascript
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: {
        bidders: ['pigeoon'],
        filter: 'include'
      }
    }
  }
});
```

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'div-banner-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: 'pigeoon',
        params: {
          networkId: 'net_ABC123',
          placementId: '12345678'
        }
      }
    ]
  }
];
```