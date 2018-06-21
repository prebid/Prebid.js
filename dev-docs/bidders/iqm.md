---
layout: bidder
title: iQM
description: Prebid iQM Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: iqm
biddercode_longer_than_12: false 
prebid_1_0_supported: true
---


### bid params

{: .table .table-bordered .table-striped }

| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `publisherId` | required | The Publisher ID from iQM. | `df5fd732-c5f3-11e7-abc4-cec278b6b50a` |
| `tagId` | required | The Tag ID from iQM. | `1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a` |
| `placementId` | required | The Placement ID from iQM. | `50cc36fe-c5f4-11e7-abc4-cec278b6b50a` |
| `bidfloor` | required | Bid floor | `0.50` |
