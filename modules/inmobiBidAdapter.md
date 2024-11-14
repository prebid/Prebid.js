# Overview

Module Name: InMobi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid-support@inmobi.com

# Description

Module that connects to InMobi's demand sources.

# Bid Params

| Name       | Scope    | Description  |  Example  | Type     |
|------------|----------|--------------|-----------|--------  |
| `plc`      | required | Placement ID | `'1234'`  | `string` |
| `bidfloor` | optional | Bid Floor    | `1.2`     | `float`  |


# Test Parameters

## Banner
```
    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },

            bids: [{
                bidder: 'inmobi',
                params: {
                    plc: '1719108420057' // Mandatory
                }
            }]

    }];
```

## Video
```
    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                video: {
                    playerSize : [300,250],
                    mimes :  ["video/x-ms-wmv", "video/mp4"],
                    minduration : 0,
                    maxduration: 30,
                    protocols : [1,2],
                    api: [1, 2, 4, 6],
                    protocols: [3, 4, 7, 8, 10],
                    placement: 1,
                    plcmt: 1
                }
            },

            // Replace this object to test a new Adapter!
            bids: [{
                bidder: 'inmobi',
                params: {
                    plc: '1443164204446401' //Mandatory
                }
            }]
    }];
```

## Native
```
    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                native: {
                        type: 'image'
                }
            },

            bids: [{
                bidder: 'inmobi',
                params: {
                    plc: '10000033152',
                    bidfloor: 0.9
                }
            }]
    }];
```        