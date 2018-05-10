---
layout: bidder
title: Beachfront
description: Prebid Beachfront Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: beachfront
biddercode_longer_than_12: false
prebid_1_0_supported : true
media_types: video
gdpr_supported: true
---

### bid params

{: .table .table-bordered .table-striped }

| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `appId` | required | Beachfront Exchange ID | `'11bc5dd5-7421-4dd8-c926-40fa653bec76'` |
| `bidfloor` | required | Bid floor | `0.01` |
| `video` | optional | Object with video parameters. See the [video section below](#beachfront-video) for details. | |

<a name="beachfront-video"></a>

### video params

{: .table .table-bordered .table-striped }

| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `mimes` | optional | Array of strings listing supported MIME types. | `["video/mp4", "application/javascript"]` |
