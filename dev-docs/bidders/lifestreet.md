---
layout: bidder
title: Lifestreet
description: Prebid Lifestreet Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: lifestreet

biddercode_longer_than_12: false

---


### bid params

{: .table .table-bordered .table-striped }
| Name            | Scope    | Description                          | Example                                   |
|:----------------|:---------|:-------------------------------------|:------------------------------------------|
| `jstag_url`     | required | JS Ad-Tag URL                        | `'//ads.lfstmedia.com/getad?site=285071'` |
| `slot`          | required | Ad Slot                              | `'slot166704'`                            |
| `adkey`         | required | Ad Key                               | `'78c'`                                   |
| `ad_size`       | required | Ad Size                              | `'160x600'`                               |
| `timeout`       | optional | Prebid.js Timeout                    | `1500`                                    |
