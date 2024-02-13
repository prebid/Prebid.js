# Overview

```
Module Name: TheAdx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@theadx.com
```

# Description

Module that connects to TheAdx demand sources

# Test Parameters

```
    var adUnits = [
        {
            code: 'test-div',
            sizes: [640,480],
            mediaTypes: {
                video: {
                    sizes: [[640, 480]],
                }
            },
            bids: [
               {
                   bidder: "theadx",
                   params: {
                        pid: 1, // publisher id
                        wid: 7, //website id
                        tagId: 19, //zone id
                    }
               }
           ]
        },{
            code: 'test-div2',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],
                },
            },
            bids: [
               {
                   bidder: "theadx",
                   params: {
                        pid: 1, // publisher id
                        wid: 7, //website id
                        tagId: 18, //zone id
                        deals:[{"id":"theadx:137"}] //optional
                    }
               }
           ]
        },{
            code: 'test-div3',
            mediaTypes: {
            native: {
                    image: {
                        required: false,
                        sizes: [100, 50]
                    },
                    title: {
                        required: false,
                        len: 140
                    },
                    sponsoredBy: {
                        required: false
                    },
                    clickUrl: {
                        required: false
                    },
                    body: {
                        required: false
                    },
                    icon: {
                        required: false,
                        sizes: [50, 50]
                    }
                },
            },
            bids: [
               {
                   bidder: "theadx",
                   params: {
                        pid: 1, // publisher id
                        wid: 7, //website id
                        tagId: 20, //zone id
                    }
               }
           ]
        }
    ];
```
