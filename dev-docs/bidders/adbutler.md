---
layout: bidder
title: AdButler
description: Prebid AdButler Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: adbutler
biddercode_longer_than_12: false
prebid_1_0_supported : true
---


### bid params

{: .table .table-bordered .table-striped }
| Name            | Scope    | Description                          | Example                  |
|:----------------|:---------|:-------------------------------------|:-------------------------|
| `accountID`     | required | Account ID                           | `'167283'`               |
| `zoneID`        | required | Zone ID                              | `'210093'`               |
| `keyword`       | optional | Keyword(s) used for custom targeting | `'green,orange'`         |
| `minCPM`        | optional | Minimum CPM value to accept          | `'1.00'`                 |
| `maxCPM`        | optional | Maximum CPM value to accept          | `'5.00'`                 |
