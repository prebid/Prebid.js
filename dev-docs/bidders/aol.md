---
layout: bidder
title: AOL
description: Prebid AOL Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: aol
biddercode_longer_than_12: false
prebid_1_0_supported: true
media_types: video
gdpr_supported: true
---

### Note:
This adapter allows use of both ONE by AOL: Display and ONE by AOL: Mobile platforms. In order to differentiate these sources of demand in your ad server and reporting, you may use the optional `onedisplay` and `onemobile` adapter aliases instead.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placement` | required | The placement ID from AOL. | `"23324932"` |
| `network` | required | The network ID from AOL. | `"5071.1"` |
| `alias` | optional | The placement alias from AOL. | `"desktop_articlepage_something_box_300_250"` |
| `server` | optional | The server domain name. Default is adserver-us.adtech.advertising.com. EU customers must use adserver-eu.adtech.advertising.com, and Asia customers adserver-as.adtech.advertising.com. | `"adserver-eu.adtech.advertising.com"` |
| `bidFloor` | optional | Dynamic bid floor (added in Prebid 0.8.1) | `"0.80"` |
