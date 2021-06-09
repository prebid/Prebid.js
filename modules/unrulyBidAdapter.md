# Overview

**Module Name**: Unruly Bid Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prodev@unrulymedia.com

# Description

Module that connects to UnrulyX for bids. 

# Test Parameters

```js
    const adUnits =
        [
          {
            "code": "outstream-ad",
            "mediaTypes": {
              "video": {
                "context": "outstream",
                "mimes": [
                  "video/mp4"
                ],
                "playerSize": [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            "floors": {
              "enforceFloors": true,
              "currency": "USD",
              "schema": {
                "delimiter": "|",
                "fields": [
                  "mediaType",
                  "size"
                ]
              },
              "values": {
                "video|*": 0.01
              }
            },
            "bids": [
              {
                "bidder": "unruly",
                "params": {
                  "siteId": 1081534
                }
              }
            ]
          },
          {
            "code": "banner-ad",
            "mediaTypes": {
              "banner": {
                "sizes": [
                  [300, 250]
                ]
              }
            },
            "bids": [
              {
                "bidder": "unruly",
                "params": {
                  "siteId": 1081534
                }
              }
            ]
          },
          {
            "code": "instream-ad",
            "mediaTypes": {
              "video": {
                "context": "instream",
                "mimes": [
                  "video/mp4"
                ],
                "playerSize": [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            "bids": [
              {
                "bidder": "unruly",
                "params": {
                  "siteId": 1081534
                }
              }
            ]
          }
        ];
```
