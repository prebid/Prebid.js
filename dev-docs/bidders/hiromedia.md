---
layout: bidder
title: HIRO Media
description: Prebid HIRO Media Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: hiromedia

biddercode_longer_than_12: false

---


### bid params

{: .table .table-bordered .table-striped }
| Name            | Scope    | Description                          | Example                  |
|:----------------|:---------|:-------------------------------------|:-------------------------|
| `accountId`     | required | Account ID                           | `'750'`                  |
| `bidUrl`        | optional | The bid server endpoint URL          | `'https://example.com/'` |
| `allowedSize`   | optional | Placement size to allow              | `[300,600]`              |
| `sizeTolerance` | optional | Tolerance of `allowedSize` in pixels | `5`                      |
