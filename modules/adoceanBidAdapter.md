# Overview

Module Name: AdOcean Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@gemius.com

# Description

AdOcean Bidder Adapter for Prebid.js.
Banner and video formats are supported.

# Test Parameters
```js
    var adUnits = [
            {
                code: 'test-div',
                sizes: [[300, 250]],
                bids: [
                    {
                        bidder: "adocean",
                        params: {
                            slaveId: 'TODO',
                            masterId: 'TODO',
                            emiter: 'myao.adocean.pl'
                        }
                    }
                ]
            }
       ];
```
