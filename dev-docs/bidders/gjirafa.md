
---
prebid_1_0_supported : true
layout: bidder
title: Gjirafa
description: Prebid Gjirafa Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: gjirafa

biddercode_longer_than_12: false


---

### Note:
The Gjirafa Header Bidding adapter requires to have: placementId param in place OR minCPM and minCPC params.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placementId` | optional | Your PlacementId (provided by Gjirafa) | `71-1` |
| `minCPM` | optional | The minCPM for units returned by Gjirafa (required if placementId is not provided) | `0.50` |
| `minCPC` | optional | The minCPC for units returned by Gjirafa (required if placementId is not provided) | `0.50` |