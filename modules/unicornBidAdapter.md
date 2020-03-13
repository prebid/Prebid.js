# Overview

**Module Name**: UNICORN Bid Adapter
**Module Type**: Bidder Adapter
**Maintainer**: service+prebid.js@bulbit.jp

# Description

Module that connects to UNICORN.

# Test Parameters

```js
    const adUnits = [{
        code: 'test-adunit1', // REQUIRED: adunit code
        mediaTypes: {
            banner: {
                sizes: [[300, 250]] // a banner size
            }
        },
        bids: [{
            bidder: 'unicorn',
            params: {
                placementId: 'rectangle-ad-1', // OPTIONAL: If placementId is empty, adunit code will be used as placementId. 
                bidfloorCpm: 0.2, // OPTIONAL: Floor CPM (JPY) defaults to 0
                accountId: 12345, // REQUIRED: Account ID for charge request
                bcat: ['IAB-1', 'IAB-2'] // OPTIONAL: blocked IAB categories
            }
        }]
    }];
```
