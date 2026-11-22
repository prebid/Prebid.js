# Overview

```
Module Name: Sevio Bidder Adapter
Module Type: Sevio Adapter
Maintainer: technical@sevio.com
```

# Description
Module that connects to Sevio bidder for bids. The Sevio Prebid adapter seamlessly integrates with Prebid.js
to bring high-performance, real-time bidding capabilities to publishers

# Test Parameters
```
 var adUnits = [{
            code: 'sevio-ad-b7a0913d-6064-4d72-8d80-ded800a75983',
            mediaTypes: {
                banner: {
                    sizes: [[728, 90]]
                }
            },
            bids: [{
                bidder: 'sevio',
                params: {
                    zone: 'b7a0913d-6064-4d72-8d80-ded800a75983'
                }
            }]
        }];
```

# Privacy
The adapter forwards the consent strings Prebid collects (`gdprConsent`, `uspConsent`, `gppConsent`) in the
request's `privacy` object.

It also honours Global Privacy Control. When Prebid marks the request with `ortb2.regs.ext.gpc = '1'`
(set automatically when the browser exposes `navigator.globalPrivacyControl`), the adapter:

- sends `privacy.gpc: 1` (otherwise `0`), so the server treats the visitor as opted out of sale and sharing;
- sends `userSyncOption: "OFF"`, so no user syncs are requested;
- does not probe for crypto wallet providers and sends `wdb: 0`.
