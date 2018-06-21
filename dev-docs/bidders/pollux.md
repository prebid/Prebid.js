---
layout: bidder
title: Pollux Network
description: Prebid Pollux Network Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: pollux
biddercode_longer_than_12: false
prebid_1_0_supported : true
---


### bid params

{: .table .table-bordered .table-striped }
| Name   | Scope    | Description                                                                                                     | Example |
| :---   | :----    | :----------                                                                                                     | :------ |
| `zone` | required | The zone ID from Pollux Network. You must identify a zone using a valid ID provided on Pollux Network platform. | `"276"` |

(Sizes set in `adUnit` object will apply to the Pollux Network bid requests. If the indicated zone does not support any of the requested sizes, a null bid will be responded.)
