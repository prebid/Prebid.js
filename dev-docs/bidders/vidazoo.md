---
layout: bidder
title: Vidazoo
description: Prebid Vidazoo Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: vidazoo
biddercode_longer_than_12: false
hide: true
prebid_1_0_supported : true
---

### bid params

{: .table .table-bordered .table-striped }
| Name             | Scope    | Description                                                                               | Example                      |
|------------------+----------+-------------------------------------------------------------------------------------------+------------------------------|
| `cId`            | required | The connection ID from Vidazoo.                                                           | `"5a3a543645ea6b0004869360"` |
| `pId`            | required | The publisher ID from Vidazoo.                                                            | `"59ac17c192832d0011283fe3"` |
| `bidFloor`       | required | The minimum bid value desired. Vidazoo will not respond with bids lower than this value.  | `0.90`                       |
