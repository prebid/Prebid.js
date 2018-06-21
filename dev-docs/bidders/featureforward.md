---
layout: bidder
title: Feature Forward
description: Prebid Feature Forward Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: featureforward

biddercode_longer_than_12: true
---

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
|:-----------|:---------|:------------|:-----------------|
| `pubId` | required | unique identifier per publisher, number range 1-999  | '32' |
| `siteId` | required | unique identifier per publisher site, number range 1-999  | '01' |
| `placementId` | required | unique identifier per placement per publisher site, ranges from 0-9 | '3' |

