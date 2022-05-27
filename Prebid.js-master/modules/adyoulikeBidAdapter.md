# Overview

Module Name: Adyoulike Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adyoulike.com

# Description

Module that connects to Adyoulike demand sources.
Banner, Native and Video ad formats are supported.

# Test Parameters
```
  var adUnits = {
    "code": "test-div",
    "mediaTypes": {
      "banner": {
        "sizes": ["300x250"]
      },
      "video": {
        context: "instream",
        playerSize: [[640, 480]]
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
    },
    bids: [{
      bidder: "adyoulike",
      params: {
        placement: "e622af275681965d3095808561a1e510"
      }
    }]
  };
```
