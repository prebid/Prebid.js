# Overview

```
Module Name: Reforge Bidder Adapter
Module Type: Bidder Adapter
Maintainer: shivani.garg@svgmedia.in
```

# Description

Connect to reforge for bids.

This adapter requires setup and approval from the reforge team.

# Test Parameters - Use case #1 - Out-Stream with targeting example and default rendering options
```
       var adUnits = [{

code: 'banner1',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250]
            ]
        }
    },
    bids: [{
        bidder: 'reforge',
        params: {
            id:"c33d3e84b93d4e2a44b4f22434ef99441678",
            at:2,
            tmax:410,
            cur:[
                "USD"
            ],
            bcat:[
                "IAB26",
                "IAB25",
                "IAB24"
            ],
            imp:[
            {
                id:"1",
                instl:0,
                bidfloor:0,
                bidfloorcur:"USD",
                banner:{
                    w:300,
                    h:250,
                    id:"1",
                    btype:[
                        4
                    ],
                    battr:[
                        8,
                        10
                    ],
                    topframe:0,
                    api:[
                        3,
                        5
                    ],
                    pos:0,
                    wmax:300,
                    hmax:250
                },
                secure:1
            }
            ],
            app:{
                id:"633a673ef641",
                name:"Weather- The Weather Channel",
                bundle:"com.baloota.dumpster",
                cat:[
                    "IAB15",
                    "IAB15-10"
                ],
                publisher:{
                    id:"80862"
                },
                storeurl:"https://itunes.apple.com/app/id295646461"
            },
            device:{
                dnt:0,
                ua:"Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
                ip:"132.154.88.63",
                geo:{
                    lat:41.9005012512207,
                    lon:-84.04460144042969,
                    type:1,
                    country:"IND"
                },
                dpidsha1:"3F6024142B7507B5096F6682E849F813BD1FDB76",
                dpidmd5:"7427557F92409725DB975392832DE653",
                make:"Apple",
                model:"iPhone",
                os:"iOS",
                osv:"12.2",
                devicetype:4,
                js:1,
                connectiontype:2,
                carrier:"WIFI",
                ifa:"3c098d88-3b09-42c2-86c2-954236d26a19"
            },
            user:{
                id:"3c098d88-3b09-42c2-86c2-954236d26a87"
            },
            ext:{
                udi:{
                    idfa:"3c098d88-3b09-42c2-86c2-954236d26a86"
                },
                fd:0,
                utctimestamp:"1561101479962",
                utcdatetime:"2019-06-21 07:17:59"
            }
        }
    }]
}];
```

