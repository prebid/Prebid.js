---
layout: bidder
title: E-Planning
description: Prebid E-Planning Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: eplanning
biddercode_longer_than_12: false
prebid_1_0_supported : true
---



### Note:
The E-Planning Header Bidding adaptor requires setup and approval from the E-Planning team. Please go to [E-Planning website](http://www.e-planning.net) for more details.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `ci` | required | Your partner ID (provided by E-Planning) | `18f66` |
| `sv` | optional | Indicates a bidder URL different than default | `ads.us.e-planning.net` |
| `isv` | optional | Indicates a CDN URL different than default | `us.img.e-planning.net` |
| `t` | optional | Indicates bidding for testing purposes | `1` |
