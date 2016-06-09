---
layout: bidder
title: AOL
description: Prebid AOL Bidder Adaptor 

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: aol

biddercode_longer_than_12: false

---



### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placement` | required | The placement ID from AOL. | `"23324932"` |
| `network` | required | The network ID from AOL. | `"5071.1"` |
| `alias` | optional | The placement alias from AOL. Must be unique per page. | `"desktop_articlepage_something_box_300_250"` |
| `server` | optional | The server domain name. Default is adserver.adtechus.com. EU customers must use adserver.adtech.de. | `"adserver.adtech.de"` |
| `sizeId` | optional | The size ID from AOL. | `"170"` |
| `bidFloor` | optional | Dynamic bid floor (added in Prebid 0.8.1) | `"0.80"` |

(The first of the `sizes` set in `adUnit` object will also apply to the AOL bid requests.)
