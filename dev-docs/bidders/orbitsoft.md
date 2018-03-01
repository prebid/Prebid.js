---
layout: bidder
title: Orbitsoft
description: Prebid Orbitsoft Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: orbitsoft
biddercode_longer_than_12: false
prebid_1_0_supported : true
---


### bid params

| Name   | Scope    | Description | Example         |
| :---   | :----    | :---------- | :------         |
| placementId   | required | The placement ID (site channel ID)        | 142     |
| requestUrl   | required | Url to perform search request        | "http://adserver.com/ads/show/hb"     |
| style     | optional | Creative styles. Actual only for text ads | ... |
| customParams | optional | Permits passing any publisher key-value pairing into the bid request     | { macro_name: "macro_value" } |

Example:
```javascript
{
    bidder: "orbitsoft",
    params: {
        placementId: 142,
        requestUrl: "https://orbitsoft.com/php/ads/hb.php",
        style: {
            title: {
                family: "Tahoma",
                size: "medium",
                weight: "normal",
                style: "normal",
                color: "0053F9"
            },
            description: {
                family: "Tahoma",
                size: "medium",
                weight: "normal",
                style: "normal",
                color: "0053F9"
            },
            url: {
                family: "Tahoma",
                size: "medium",
                weight: "normal",
                style: "normal",
                color: "0053F9"
            },
            colors: {
                background: "ffffff",
                border: "E0E0E0",
                link: "5B99FE"
            }
        }
        customParams: {
            macro_name: "macro_value"
        }
    }
}
```
