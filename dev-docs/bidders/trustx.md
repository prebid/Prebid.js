---
layout: bidder
title: TrustX
description: Prebid Trustx Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: trustx
biddercode_longer_than_12: false
prebid_1_0_supported : true
---


### bid params

{: .table .table-bordered .table-striped }
| Name | Scope    | Description                                                                                              | Example |
| :--- | :----    | :----------                                                                                              | :------ |
| `uid`| required | Represents the TrustX bidder system Ad Slot ID associated with the respective div id from the site page. | `42`    |

### global params

These parameters must be specified as properties of the 'window' object.

{: .table .table-bordered .table-striped }
| Name | Scope    | Description                                                                                                                                                                                                                   | Example |
| :--- | :----    | :----------                                                                                                                                                                                                                   | :------ |
| `globalprebidTrustxPriceType`| optional | Can take the values `gross` or `net`, default value is `net`. Net represents the header bid price with the TrustX header bidder margin already extracted. Gross price does contain the TrustX bidder margin within. | `gross` |
