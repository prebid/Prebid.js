# Overview

Module Name: Adyoulike Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adyoulike.com

# Description

Module that connects to Adyoulike demand sources.
Banner formats are supported.

# Test Parameters
```
    var adUnits = {
    "code": "test-div",
    "mediaTypes": {
      "banner": {
        "sizes": ["300x250"]
      },
      "native": {
        "image": {
          "required": true,
        },
        "title": {
          "required": true,
          "len": 80
        },
        "cta": {
          "required": false
        },
        "sponsoredBy": {
          "required": true
        },
        "clickUrl": {
          "required": true
        },
        "privacyIcon": {
          "required": false
        },
        "privacyLink": {
          "required": false
        },
        "body": {
          "required": true
        },
        "icon": {
          "required": true,
          "sizes": []
        }
      }
      bids: [{
        bidder: "adyoulike",
        params: {
          placement: 194 f787b85c829fb8822cdaf1ae64435,
          DC: "fra01", // Optional for set the data center name
        }
      }]
    };
```
