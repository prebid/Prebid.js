---
layout: bidder
title: Oneplanetonly
description: Prebid Oneplanetonly Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: oneplanetonly
biddercode_longer_than_12: true
prebid_1_0_supported : true
---


### bid params

| Name   | Scope    | Description | Example         |
| :---   | :----    | :---------- | :------         |
| siteId   | required | The site id     | '5'     |
| adUnitId | required | The ad unit id  | '5-4587544'     |


Example:
```javascript
{
    bidder: 'oneplanetonly',
    params: {
      siteId: '5',
      adUnitId: '5-4587544'
    }
}
```
