---
layout: bidder
title: Media.net
description: Prebid Media.net Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: medianet
biddercode_longer_than_12: false
hide: true
prebid_1_0_supported : true
gdpr_supported: true
---

### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description | Example           |
|----------------+----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------|
| `cid`  | required | The customer id provided by Media.net.         | `"8CUX0H51C"`        |
| `crid` | optional | The placement id provided by Media.net | `"1234567"` |
| `bidfloor` | optional | `Bidfloor for the impression`| `1.0`|
