---
layout: bidder
title: Gamoshi Gambid
description: Prebid Gambid Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: gambid
biddercode_longer_than_12: false
hide: true
prebid_1_0_supported : true
media_types: banner, video
gdpr_supported: true
---

### Bid params

{: .table .table-bordered .table-striped }
| Name              | Scope    | Description                                                   | Example              |
|-------------------+----------+---------------------------------------------------------------+----------------------|
| `supplyPartnerId` | required | ID of the supply partner you created in the Gambid dashboard. | `"12345"`            |
| `rtbEndpoint`     | optional | If you have a whitelabel account on Gamoshi, specify it here. | `"rtb.mybidder.com"` |

This adapter only requires you to provide your supply partner ID, and optionally your RTB endpoint, in order to request
bids from your Gamoshi Gambid account.
