---
layout: bidder
title: Twenga
description: Prebid Twenga Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: twenga
biddercode_longer_than_12: false
---

### bid params

{: .table .table-bordered .table-striped }
| Name          | Scope    | Description                                                                                                                | Example    |
| :------------ | :------- | :------------------------------------------------------------------------------------------------------------------------- | :--------- |
| `placementId` | required | Identifier for the ad placement, as provided by Twenga.                                                                    | `"123456"` |
| `siteId`      | optional | Identifier for the site, as an integer value. Mainly used for reports.                                                     | `123456`   |
| `publisherId` | optional | Identifier for the publisher, as an integer value. Mainly used for reports.                                                | `123456`   |
| `currency`    | optional | ISO 4217 currency code for the bid price and floor. The default currency is EUR.                                           | `"USD"`    |
| `bidFloor`    | optional | Minimum CPM to participate with a bid for this ad placement. Should be in EUR or the currency specified by `currency`.     | `0.35`     |
| `country`     | optional | Two-letter ISO 3166-1 country code for merchant selection. By default, the user IP address will be used to determine this. | `DE`       |
