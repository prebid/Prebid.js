---
layout: bidder
title: GetIntent
description: Prebid GetIntent Bidder Adaptor 

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: getintent

biddercode_longer_than_12: false

---


### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `pid` | required | Publisher ID registered in GetIntent system | `123` |
| `tid` | required | Unique Tag ID | `abc` |
| `cur` | optional | Currency of the ad request. Default is the one configured at publisher settings. | `USD` |
| `floor` | optional | Floor price for the request. | `0.123` |
