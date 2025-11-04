# Overview

Module Name: AdOcean Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@gemius.com

# Description

AdOcean Bidder Adapter for Prebid.js.
Banner and video formats are supported.

# Test Parameters Banner
```js
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 200]]
                }
            },
            bids: [
                {
                    bidder: "adocean",
                    params: {
                        slaveId: 'adoceanmyaotcpiltmmnj',
                        masterId: 'ek1AWtSWh3BOa_x2P1vlMQ_uXXJpJcbhsHAY5PFQjWD.D7',
                        emitter: 'myao.adocean.pl'
                    }
                }
            ]
        }
    ];
```
# Test Parameters Video
```js
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                video: {
                    context: 'instream',
                    playerSize: [300, 200]
                }
            },
            bids: [
                {
                    bidder: "adocean",
                    params: {
                        slaveId: 'adoceanmyaonenfcoqfnd',
                        masterId: '2k6gA7RWl08Zn0bi42RV8LNCANpKb6LqhvKzbmK3pzP.U7',
                        emitter: 'myao.adocean.pl'
                    }
                }
            ]
        }
    ];
```
