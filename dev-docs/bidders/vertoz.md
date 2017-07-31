---
layout: bidder
title: Vertoz
description: Prebid Vertoz Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: vertoz
biddercode_longer_than_12: false
---

### Note:

The Vertoz adapter currently doesn't support multiple sizes per ad placement and will favour the first one if multiple sizes exists.

### bid params

{: .table .table-bordered .table-striped } 

| Name | Scope    | Description        | Example  |
| :--- | :----    | :----------        | :------  |
| placementId   | required | vertoz placement id    | `'VH-HB-123'` |
| cpmFloor      | optional | cpm floor price        | `0.1` |
