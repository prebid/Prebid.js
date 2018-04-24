---
layout: bidder
title: SARA
description: SARA Bidder Adapter
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: sara
biddercode_longer_than_12: false
prebid_1_0_supported : true
---


### bid params

{: .table .table-bordered .table-striped }
| Name       | Scope    | Description                                                                                                                                                                                                | Example |
| :---       | :----    | :----------                                                                                                                                                                                                | :------ |
| `uid`      | required | Represents the SARA bidder system Ad Slot ID associated with the respective div id from the site page.                                                                                                     | `5`     |
| `priceType`| optional | Can take the values `gross` or `net`, default value is `net`. Net represents the header bid price with the header bidder margin already extracted. Gross price does contain the SARA bidder margin within. | `gross` |
