# Overview

Module Name: MallTV Bidder Adapter Module

Type: Bidder Adapter

Maintainer: myhedin@gjirafa.com

# Description

MallTV Bidder Adapter for Prebid.js.

# Test Parameters

```js
var adUnits = [
  {
    code: "test-div",
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 300],
        ],
      },
    },
    bids: [
      {
        bidder: "malltv",
        params: {
          propertyId: "105134", //Required
          placementId: "846832", //Required
          data: {
            //Optional
            catalogs: [
              {
                catalogId: 9,
                items: ["193", "4", "1"],
              },
            ],
            inventory: {
              category: ["tech"],
              query: ["iphone 12"],
            },
          },
        },
      },
    ],
  },
  {
    code: "test-div",
    mediaTypes: {
      video: {
        context: "instream",
      },
    },
    bids: [
      {
        bidder: "malltv",
        params: {
          propertyId: "105134", //Required
          placementId: "846832", //Required
          data: {
            //Optional
            catalogs: [
              {
                catalogId: 9,
                items: ["193", "4", "1"],
              },
            ],
            inventory: {
              category: ["tech"],
              query: ["iphone 12"],
            },
          },
        },
      },
    ],
  },
];
```
