# Overview

```
Module Name: Mile Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@mile.tech
```

# Description

This bidder adapter connects to Mile demand sources.

# Bid Params

| Name          | Scope    | Description                       | Example          | Type   |
|---------------|----------|-----------------------------------|------------------|--------|
| `placementId` | required | The placement ID for the ad unit  | `'12345'`        | string |
| `siteId`      | required | The site ID for the publisher     | `'site123'`      | string |
| `publisherId` | required | The publisher ID                  | `'pub456'`       | string |

# Example Configuration

```javascript
var adUnits = [{
    code: 'test-banner',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
    },
    bids: [{
        bidder: 'mile',
        params: {
            placementId: 'test-placement',
            siteId: 'test-site',
            publisherId: 'test-pub'
        }
    }]
}];
```

# User Sync Configuration

To enable user syncing, configure Prebid.js with:

```javascript
pbjs.setConfig({
    userSync: {
        iframeEnabled: true, // Enable iframe syncs 
        filterSettings: {
            iframe: {
                bidders: ['mile'],
                filter: 'include'
            }
        }
    }
});
```

# Test Parameters

```javascript
{
    bidder: 'mile',
    params: {
        placementId: 'test-placement',
        siteId: 'test-site',
        publisherId: 'test-publisher-id'
    }
}
```

