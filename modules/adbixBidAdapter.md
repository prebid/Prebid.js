# Overview

Module Name: Adbix Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: admin@adbix.net

# Description

The Adbix bidder adapter connects Prebid.js publishers to the Adbix OpenRTB auction endpoint.

The adapter currently supports banner inventory.

# Test Parameters

The following test configuration consistently returns an Adbix test creative:

```javascript
var adUnits = [
  {
    code: 'adbix-test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'adbix',
        params: {
          publisherId: 'test-publisher',
          placementId: 'test-300x250',
          test: true
        }
      }
    ]
  }
];
```

# Bid Parameters

| Name | Scope | Description | Example | Type |
|---|---|---|---|---|
| `publisherId` | Required | Adbix publisher identifier | `'test-publisher'` | String |
| `placementId` | Required | Adbix placement identifier | `'test-300x250'` | String |
| `test` | Optional | Enables the Adbix test response | `true` | Boolean |

# Supported Media Types

- Banner

# User Sync

The adapter may register an image user-sync request when image/pixel syncing is enabled by the publisher.

User-sync endpoint:

```text
https://adbix.net/sync/index.php
```

The auction continues to work when image user syncing is disabled.

# Privacy

For information about Adbix privacy practices, see:

```text
https://adbix.net/privacy-policy.php
```
