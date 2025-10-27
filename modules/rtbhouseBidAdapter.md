# Overview

Module Name: RTB House Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@rtbhouse.com

# Description

Connects to RTB House unique demand.
Banner and native formats are supported.
Unique publisherId is required. 
Please reach out to pmp@rtbhouse.com to receive your own

# Test Parameters
```
    var adUnits = [
           // banner
           {
               code: 'test-div',
               mediaTypes: {
	           banner: {
                       sizes: [[300, 250]],
                   }
               },
               bids: [
                   {
                       bidder: "rtbhouse",
                       params: {
                           region: 'prebid-eu',
                           publisherId: 'PREBID_TEST_ID',
                           bidfloor: 0.01  // optional
                       }
                   }
               ]
           },
           // native
           {
                code: 'test-div',
                mediaTypes: {
                    native: {
                        title: {
                            required: true,
                            len: 25
                        },
                        image: {
                            required: true,
                            sizes: [300, 250]
                        },
                        body: {
                            required: true,
                            len: 90
                        }
                    }
                },
                bids: [
                    {
                        bidder: "rtbhouse",
                        params: {
                            region: 'prebid-eu',
                            publisherId: 'PREBID_TEST_ID'
                            bidfloor: 0.01  // optional
                        }
                    }
                ]
           }
       ];
```

# Protected Audience API (FLEDGE) support
There’s an option to receive demand for Protected Audience API (FLEDGE/PAAPI) 
ads using RTB House bid adapter. 
Prebid’s [paapiForGpt](https://docs.prebid.org/dev-docs/modules/paapiForGpt.html) 
module and Google Ad Manager is currently required.

The following steps should be taken to setup Protected Audience for RTB House:

1. Reach out to your RTB House representative for setup coordination.

2. Build and enable FLEDGE module as described in 
[paapiForGpt](https://docs.prebid.org/dev-docs/modules/paapiForGpt.html) 
module documentation.

    a. Make sure to enable RTB House bidder to participate in FLEDGE. If there are any other bidders to be allowed for that, add them to the **bidders** array:
    ```javascript
    pbjs.setConfig({
        paapi: {
            bidders: ["rtbhouse"],
            enabled: true
        }
    });
    ```

    b. If you as a publisher have your own [decisionLogicUrl](https://github.com/WICG/turtledove/blob/main/FLEDGE.md#21-initiating-an-on-device-auction)
    you may utilize it by setting up a dedicated `fledgeConfig` object:
    ```javascript
    pbjs.setConfig({
        paapi: {
            bidders: ["rtbhouse"],
            enabled: true
        },
        fledgeConfig: {
            seller: 'https://seller.domain',
            decisionLogicUrl: 'https://seller.domain/decisionLogicFile.js',
            sellerTimeout: 100
        }
    });
    ```
    The `decisionLogicUrl` must be in the same domain as `seller` and has to respond with `X-Allow-FLEDGE: true` http header.

    `sellerTimeout` is optional, defaults to 50 as per spec, will be clamped to 500 if greater.
