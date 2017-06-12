---
layout: bidder
title: Index Exchange (Casale)
description: Prebid Index Exchange (Casale) Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: indexExchange

biddercode_longer_than_12: true

---

### Prebid Server Note:
Before configuring the Index Exchange adapter as S2S, you must reach out to the Index Exchange team for approval and setup steps.

#### Send All Bids Ad Server Keys:
(truncated to 20 chars due to [DFP limit](https://support.google.com/dfp_premium/answer/1628457?hl=en#Key-values))

`hb_pb_indexExchange`
`hb_adid_indexExchang`
`hb_size_indexExchang`

#### Default Deal ID Keys:
`hb_deal_indexExchang`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `id` | required | The placement ID |  |
| `siteID` | required | the site ID | |
| `tier2SiteID` | optional | | |
| `tier3SiteID` | optional | | |
