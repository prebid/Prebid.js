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
| Name          | Scope    | Description                                                                                                                                 | Example                    |
| :---          | :----    | :----------                                                                                                                                 | :------                    |
| `placementId` | required | The placement ID from AppNexus.  You may identify a placement using the `invCode` and `member` instead of a placement ID.                   | `"234234"`                 |
| `randomKey`   | optional | A key specified by the publisher. The value maps to a querystring segment for enhanced buy-side targeting. Multiple k-v pairs can be added. | `randomKey` => `randomVal` |
| `invCode`     | optional | The inventory code from AppNexus. Must be used with `member`                                                                                | `"abc123"`                 |
| `member`      | optional | The member ID  from AppNexus. Must be used with `invCode`                                                                                   | `"12345"`                  |
| `reserve`     | optional | Sets a floor price for the bid that is returned                                                                                             | `0.90`                     |

(Sizes set in `adUnit` object will also apply to the AppNexus bid requests.)
