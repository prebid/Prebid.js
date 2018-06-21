---
layout: bidder
title: 33Across
description: Prebid 33Across Bidder Adapter
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: 33across
biddercode_longer_than_12: false
prebid_1_0_supported : true
---


### bid params

{: .table .table-bordered .table-striped }
| Name            | Scope    | Description                          | Example                  |
|:----------------|:---------|:-------------------------------------|:-------------------------|
| `siteId`        | required | Publisher  GUID from 33Across        | `'pub123'`               |
| `productId`     | required | 33Across Product ID that the Publisher has registered for (use only 'siab' for the present since others are not supported yet)  | `'siab'`          