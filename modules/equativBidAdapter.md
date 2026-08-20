# Overview

```
Module Name: Equativ Bidder Adapter (beta)
Module Type: Bidder Adapter
Maintainer: support@equativ.com
```

# Description

Connect to Equativ for bids.

The Equativ adapter requires setup and approval from the Equativ team. Please reach out to your technical account manager for more information.

# Test Parameters

## Web or In-app
```javascript
var adUnits = [
    {
        code: '/589236/banner_1',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [
            {
                bidder: 'equativ',
                params: {
                    networkId: 13,           // mandatory if no ortb2.(site or app).publisher.id set
                    placementuuid: 'abc-123', // optional, preferred way to identify inventory
                    siteId: 20743,           // optional, DEPRECATED - use placementuuid instead
                    pageId: 89653,           // optional, DEPRECATED - use placementuuid instead
                    formatId: 291,           // optional, DEPRECATED - use placementuuid instead
                }
            }
        ]
    }
];
```

# Parameters

| Name            | Scope    | Description                                                                                          | Type     |
|-----------------|----------|------------------------------------------------------------------------------------------------------|----------|
| `networkId`     | optional | Equativ network id. Mandatory unless `ortb2.(site\|app\|dooh).publisher.id` is set.                   | `number` |
| `placementuuid` | optional | Placement identifier used to source inventory. Preferred way to identify inventory; forwarded as `imp.ext.bidder.plcmtuuid`. When legacy params are also supplied, all fields are forwarded and the downstream receiver decides which to use. | `string` |
| `siteId`        | optional | **Deprecated.** Equativ site id. Use `placementuuid` instead. Kept only to support the ramp-up.      | `number` |
| `pageId`        | optional | **Deprecated.** Equativ page id. Use `placementuuid` instead. Kept only to support the ramp-up.      | `number` |
| `formatId`      | optional | **Deprecated.** Equativ format id. Use `placementuuid` instead. Kept only to support the ramp-up.    | `number` |
