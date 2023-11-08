# Overview
Module Name: Integr8 Bidder Adapter Module

Type: Bidder Adapter

Maintainer: myhedin@gjirafa.com

# Description
Integr8 Bidder Adapter for Prebid.js.

# Test Parameters
```js
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250]
                ]
            }
        },
        bids: [{
            bidder: 'integr8',
            params: {
                propertyId: '105135',   //Required
                placementId: '846837',  //Required,
                deliveryUrl: 'https://central.sea.integr8.digital/bid', //Optional
                data: {                 //Optional
                    catalogs: [{
                        catalogId: "699229",
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
            bidder: 'integr8',
            params: {
                propertyId: '105135',  //Required
                placementId: '846835', //Required,
                deliveryUrl: 'https://central.sea.integr8.digital/bid', //Optional
                data: {                //Optional
                    catalogs: [{
                        catalogId: "699229",
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
