---
layout: bidder
title: AppNexus
description: Prebid AppNexus Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: appnexus

biddercode_longer_than_12: false

---


### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placementId` | required | The placement ID from AppNexus. | "234234" |
| `randomKey` | optional | a random key specified by the publisher to send into AppNexus. The value is a publisher specified value. These values map to querystring segments for enhanced targeting on the buy side. Multiple key value pairs can be added here. | `randomKey` => `randomVal`. |
| `invCode` | optional | The inventory code from AppNexus. Must be used with `member` | "abc123" |
| `member` | optional | The member ID  from AppNexus. Must be used with `invCode` | "12345" |

(Sizes set in `adUnit` object will also apply to the AppNexus bid requests.)
