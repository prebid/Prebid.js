# Overview

Module Name: Preciso Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@preciso.net


# Description

Module that connects to Preciso's demand sources.

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
                       bidder: "preciso",
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
                        bidder: "preciso",
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
ads using Preciso bid adapter. 
Prebid’s [fledgeForGpt](https://docs.prebid.org/dev-docs/modules/fledgeForGpt.html) 
module and Google Ad Manager is currently required.

The following steps should be taken to setup Protected Audience for Preciso:

1. Reach out to your RTB House representative for setup coordination.

2. Build and enable FLEDGE module as described in 
[fledgeForGpt](https://docs.prebid.org/dev-docs/modules/fledgeForGpt.html) 
module documentation.

    a. Make sure to enable Preciso bidder to participate in FLEDGE. If there are any other bidders to be allowed for that, add them to the **bidders** array:
    ```javascript
    pbjs.setBidderConfig({
        bidders: ["Preciso"],
        config: {
            fledgeEnabled: true
        }
    });
    ```

    b. If you as a publisher have your own [decisionLogicUrl](https://github.com/WICG/turtledove/blob/main/FLEDGE.md#21-initiating-an-on-device-auction)
    you may utilize it by setting up a dedicated `fledgeConfig` object:
    ```javascript
    pbjs.setBidderConfig({
        bidders: ["Preciso"],
        config: {
            fledgeEnabled: true,
            fledgeConfig: {
                seller: 'https://seller.domain',
                decisionLogicUrl: 'https://seller.domain/decisionLogicFile.js',
                sellerTimeout: 100
            }
        }
    });
    ```
    The `decisionLogicUrl` must be in the same domain as `seller` and has to respond with `X-Allow-FLEDGE: true` http header.

    `sellerTimeout` is optional, defaults to 50 as per spec, will be clamped to 500 if greater.
