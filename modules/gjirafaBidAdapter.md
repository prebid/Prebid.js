# Overview
Module Name: Gjirafa Bidder Adapter Module

Type: Bidder Adapter

Maintainer: arditb@gjirafa.com

# Description
Gjirafa Bidder Adapter for Prebid.js.

# Test Parameters
```js
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [728, 90]
                ]
            }
        },
        bids: [{
            bidder: 'gjirafa',
            params: {
                propertyId: '105227',   //Required
                placementId: '846841',  //Required
                data: {                 //Optional
                    catalogs: [{
                        catalogId: 9,
                        items: ["193", "4", "1"]
                    }],
                    inventory: {
                        category: ["tech"],
                        query: ["iphone 12"]
                    }
                }
            }
        }]
    },
    {
        code: 'test-div',
        mediaTypes: {
            video: {
                context: 'instream'
            }
        },
        bids: [{
            bidder: 'gjirafa',
            params: {
                propertyId: '105227',  //Required
                placementId: '846836', //Required
                data: {                //Optional
                    catalogs: [{
                        catalogId: 9,
                        items: ["193", "4", "1"]
                    }],
                    inventory: {
                        category: ["tech"],
                        query: ["iphone 12"]
                    }
                }
            }
        }]
    }
];
```
