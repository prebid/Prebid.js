---
layout: bidder
title: Piximedia
description: Prebid Piximedia Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: piximedia

biddercode_longer_than_12: false

---


### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `siteId` | required | The site ID from Piximedia. | "SITE" |
| `placementId` | required | The placement ID from Piximedia. | "PLACEMENT" |
| `sizes` | optional | Override the default prebid size array | [[300, 250]] |

(Sizes set in `adUnit` object will also apply to the Piximedia bid requests.)
