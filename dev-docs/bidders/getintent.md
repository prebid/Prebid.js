---
layout: bidder
title: GetIntent
description: Prebid GetIntent Bidder Adaptor 
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: getintent
biddercode_longer_than_12: false
prebid_1_0_supported : true
media_types: video
---


### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `pid` | required | Publisher ID registered in GetIntent system | `123` |
| `tid` | optional | Unique Tag ID. Required if multiple tags are used on the same page. | `abc` |
| `cur` | optional | Currency of the ad request. Default is the one configured at publisher settings. | `USD` |
| `floor` | optional | Floor price for the request. | `0.123` |
| `video` | optional | Object with video parameters. See the [video section below](#getintent-video). || |

<a name="getintent-video"></a>

#### video

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `protocols` | optional | The list of the restricted VAST protocol versions. Possible values: `1` – VAST 1.0, `2` – VAST 2.0, `3` – VAST 3.0, `4` – VAST 1.0 Wrapper, `5` – VAST 2.0 Wrapper, `6` – VAST 3.0 Wrapper. | `protocols: [4,5,6]` |
| `mimes` | optional | Array of Mime Type strings. | `mimes: ["application/javascript"]` |
| `min_dur` | optional | Minimal video duration. | `min_dur: 30` |
| `max_dur` | optional | Maximal video duration. | `max_dur: 30` |
| `min_btr` | optional | Minimal Video bitrate. | `min_btr: 256` |
| `max_btr` | optional | Maximal Video bitrate. | `max_btr: 512` |
| `vi_format` | optional | Video inventory format. Possible values: `1` - In-Stream video, `2` - Out-Stream video. | `vi_format: 1` |
| `api` | optional | API of the inventory. Possible values: `1` - VPAID 1.0, `2` - VPAID 2.0, `3` - MRAID-1, `4` - ORMMA, `5` - MRAID-2. | `api: [3,4]` |
| `skippable` | optional | Skippability of the inventory. Possible values (case insensitive): `ALLOW` - skippable inventory is allowed, `NOT_ALLOW` - skippable inventory is not allowed, `REQUIRE` - only skippable inventory is allowed, `UNKNOWN` - skippability is unknown (default value). | `skippable: "NOT_ALLOW"` |
