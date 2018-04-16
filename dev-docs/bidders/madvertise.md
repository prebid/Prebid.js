---
layout: bidder
title: Madvertise
description: Prebid Madvertise Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: madvertise
biddercode_longer_than_12: false
prebid_1_0_supported : true
---

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
|:-----------|:---------|:------------|:-----------------|
| `s` | required | Zone code. This parameter should be the unique Publisher ID of your mobile application or website. | "/4543756/prebidadaptor/madvertiseHB" |
| `donottrack` | optional | Possible values are "0" or "1". If the of value is "1", the user does not want to be tracked (opt out). | 1 |
| `lat` | optional | Latitude | 48.866667 |
| `long` | optional | Longitude | 2.333333 |
| `age` | optional | Age | 19 |
| `gender` | optional | Gender m or f | "f" |
| `locale` | optional | Locale | "fr" |
| `floor` | optional | Bid floor | 1.0 |
