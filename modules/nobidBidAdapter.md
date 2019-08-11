---
layout: bidder
title: Nobid
description: Prebid Nobid Bidder Adaptor
biddercode: nobid
hide: true
media_types: banner
gdpr_supported: true
---

### Bid Params

{: .table .table-bordered .table-striped }
| Name          | Scope    | Description | Example | Type     |
|---------------|----------|-------------|---------|----------|
| `siteId` | required | siteId is provided by your Nobid account manager |         | `integer` |

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "nobid",
                    params: {
                        siteId: <SITE_ID_PROVIDED_BY_YOUR_NOBID_ACCOUNT_MANAGER>
                    }
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
            bids: [
                {
                    bidder: "nobid",
                    params: {
                        siteId: <SITE_ID_PROVIDED_BY_YOUR_NOBID_ACCOUNT_MANAGER>
                    }
                }
            ]
        }
    ];
```