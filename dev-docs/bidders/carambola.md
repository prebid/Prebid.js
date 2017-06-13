---
layout: bidder
title: Carambola
description: Prebid Carambola Bidder Adaptor 

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
| `pid` | required | The publisher ID from Carambola. | `"hbtest"` |
| `wid` | required | The widget ID from Carambola. Must be unique per page. | `"0"` |
| `did` | optional | The script domain ID from Carambola. | `"110000"` |
| `bidFloor` | optional | Dynamic bid floor | `"0.45"` |
