---
layout: bidder
title: Sonobi
description: Prebid Sonobi Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: sonobi

biddercode_longer_than_12: false

---



### release version:
`0.8.0`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `dom_id` | required | The DOM Id of the ad slot | "div-gpt-ad-1234567890123-0" |
| `ad_unit` | optional | The ad unit ID | "/1234567/ad_unit_id" |
| `placement_id` | optional | The placement ID | "a1b2c3de45fg67h89i01" |

### Caveats

* You are required to pass either an ad_unit *or* placement_id value
* Your account manager will let you know which to use
* If you require assistance with any of our open source code, please email support at github@sonobi.com
