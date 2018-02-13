---
layout: bidder
title: C1X
description: Prebid C1X Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: c1x

biddercode_longer_than_12: false

---

### Note:

The C1X Header Bidding adaptor requires approval from the C1X team. Please reach out to  <header-bidding@c1exchange.com> for more information.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
|:-----------|:---------|:------------|:-----------------|
| `siteId` | required | Site ID from which the request is originating | `'999'` |
| `pixelId` | optional | Publisher's pixel ID | `'12345'` |
| `floorPriceMap` | optional | Minimum floor prices needed from the DSP's to enter the auction | `{'300x250': 4.00,'300x600': 3.00}` |
| `dspid` | optional | DSP ID | `'4321'` |
| `pageurl` | optional | Url of the webpage where the request is originating from | `'4321'` |
