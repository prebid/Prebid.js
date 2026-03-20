# Overview

```
Module Name:  Magnite Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   header-bidding@magnite.com
```

# Description

Connect to Magnite's exchange for bids via a full OpenRTB integration.

The Magnite adapter requires setup and approval from the
Magnite team. Please reach out to your account team or
header-bidding@magnite.com for more information.

# Bid Parameters

| Name | Scope | Type | Description | Example |
| ---- | ----- | ---- | ----------- | ------- |
| `accountId` | required | Number | Magnite account ID. | `14062` |
| `siteId` | required | Number | Magnite site ID. | `70608` |
| `zoneId` | required | Number | Magnite zone ID. | `498816` |

# Test Parameters

```
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [
            {
                bidder: "magnite",
                params: {
                    accountId: 14062,
                    siteId: 70608,
                    zoneId: 498816
                }
            }
        ]
    }
];

var videoAdUnit = {
    code: 'myVideoAdUnit',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [640, 480],
            mimes: ['video/mp4', 'video/x-ms-wmv'],
            protocols: [2, 5],
            maxduration: 30,
            linearity: 1,
            api: [2]
        }
    },
    bids: [
        {
            bidder: 'magnite',
            params: {
                accountId: 14062,
                siteId: 70608,
                zoneId: 498816
            }
        }
    ]
};
```

# Configuration

Add the following code to enable user syncing. By default, Prebid.js turns off user syncing through iframes. Magnite recommends enabling iframe-based user syncing to improve match rates and bid performance.

```javascript
pbjs.setConfig({
    userSync: {
        iframeEnabled: true
    }
});
```
