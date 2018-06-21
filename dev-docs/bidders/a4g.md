---
layout: bidder
title: A4G
description: Prebid A4G Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: a4g
biddercode_longer_than_12: false
prebid_1_0_supported : true
gdpr_supported: true
---

### bid params

{: .table .table-bordered .table-striped } 

| Name        | Scope    | Description                                | Example                              |
| :---------- | :------- | :----------------------------------------- | :----------------------------------- |
| `zoneId`     | required | The A4G zone ID                            | `"59304"`                            |
| `deliveryUrl` | optional | The bid endpoint (might be used for debug) | `"http://dev01.ad4game.com/v1/bid"`  |
