---
layout: bidder
title: OpenX
description: Prebid OpenX Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: openx

biddercode_longer_than_12: false

---



### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `jstag_url` | required | The publisher specific URL of jstag | `ox-d.xyz.servedbyopenx.com/w/1.0/jstag?ef=db&nc=23923-EF` |
| `unit` | required | the ad unit ID | "538562284" |
| `pgid` | optional | The page ID | "534205285" |
