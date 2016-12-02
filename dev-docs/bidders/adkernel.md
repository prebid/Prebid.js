---
layout: bidder
title: AdKernel
description: Prebid AdKernel Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: adkernel
biddercode_longer_than_12: false
---

### Note:

The AdKernel adapter doesn't support multiple sizes per ad-unit and will use the first one if multiple sizes are defined.

### bid params

{: .table .table-bordered .table-striped } 

| Name | Scope    | Description        | Example  |
| :--- | :----    | :----------        | :------  |
| host   | required | Ad network's RTB host    | `'cpm.metaadserving.com'` |
| zoneId | required | RTB zone id        | `'30164'` |
