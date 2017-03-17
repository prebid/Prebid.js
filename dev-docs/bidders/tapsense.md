---
layout: bidder
title: TapSense
description: Prebid TapSense Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: tapsense

biddercode_longer_than_12: false

---



### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `ad_unit_id` | required | The placement ID from TapSense. | `"5580935be4b0a4d1a4e8d2b6"` |
| `user` | required | The user's IDFA | `"771fc655-6e4e-4bae-a4b6-751614d788b5"` |
| `refer` | optional | Site that ad request is originating from. | `"https://tapsense.com"` |
| `lat` | optional | User's latitude | `“47.5643”"` |
| `long` | optional | User's longitude | `“-122.151”` |
| `price_floor` | optional | Bid floor in dollars | `"0.04"` |

Currently TapSense only supports banner (320x50) ad sizes for header bidding.
