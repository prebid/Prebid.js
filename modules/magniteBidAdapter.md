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
| `floor` | optional | Number | Minimum bid floor in **USD** for this impression. Used only when `imp.bidfloor` was not already set from the [Price Floors](https://docs.prebid.org/dev-docs/modules/floors.html) module (see **Bid floors** below). Must parse as a finite number. | `2.50` |

# Bid floors

Magnite’s request is built with the shared ORTB converter. Floors behave as follows:

1. **Price Floors module (recommended)**  
   If the Price Floors module is included in your build and configured, the adapter uses `bidRequest.getFloor()` (with currency **USD**) to populate OpenRTB `imp.bidfloor` and `imp.bidfloorcur` when the returned currency is **USD**.  
   See the [Price Floors module](https://docs.prebid.org/dev-docs/modules/floors.html) for setup (`pbjs.setConfig({ floors: ... })`, rules, enforcement, etc.).

2. **`params.floor` (fallback)**  
   If `imp.bidfloor` is still unset after that step—for example, no floors module, no matching rule, or `getFloor` returned a non-USD currency—the adapter may set `imp.bidfloor` and `imp.bidfloorcur: 'USD'` from **`params.floor`** when it is a valid numeric value.

**USD only on `imp`:** Non-USD results from `getFloor` are not copied onto `imp.bidfloor` / `imp.bidfloorcur`. In those cases, `params.floor` (USD) can still apply as the fallback.

**Build note:** To use dynamic floors from the module, include **`priceFloors`** (and typically **`currency`**) in your Prebid bundle alongside **`magniteBidAdapter`**.

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
                    zoneId: 498816,
                    floor: 1.25
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
