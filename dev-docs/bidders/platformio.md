---
layout: bidder
title: Platform.io
description: Prebid Platform.io Bidder Adapter

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: platformio

biddercode_longer_than_12: false


---

### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                         | Example |
| :------------- | :------- | :---------------------------------- | :------ |
| `pubId`        | required | The publisher account ID            | `28082` |
| `siteId`       | required | The publisher site ID               | `26047` |
| `size`         | required | Ad size identifier                  | `300X250` |
| `placementId`  | optional | The publisher placement ID          | `17394` |
| `bidFloor`     | optional | The bid floor                       | `0.001` |
