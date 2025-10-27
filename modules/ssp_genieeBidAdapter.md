# Overview

```
Module Name: Geniee Bid Adapter
Module Type: Bidder Adapter
Maintainer: supply-carpet@geniee.co.jp
```

# Description
This is [Geniee](https://geniee.co.jp) Bidder Adapter for Prebid.js.
(This is Geniee *SSP* Bidder Adapter. The another adapter named "Geniee Bid Adapter" is Geniee *DSP* Bidder Adapter.)

Please contact us before using the adapter.

We will provide ads when satisfy the following conditions:

- There are a certain number bid requests by zone
- The request is a Banner ad
- Payment is possible in Japanese yen or US dollars
- The request is not for GDPR or COPPA users

Thus, even if the following test, it will be no bids if the request does not reach a certain requests.

# Test Parameters

```js
var adUnits = [
    {
        code: 'banner-ad',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'ssp_geniee',
            params: {
                zoneId: 1573195
            }
        }]
    },
];
```
