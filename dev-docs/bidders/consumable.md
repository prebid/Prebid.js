---
layout: bidder
title: Consumable
description: Prebid Consumable Bidder Adaptor 
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: consumable
biddercode_longer_than_12: false
prebid_1_0_supported: true
---

### Note:
The Consumable adaptor requires setup and approval from your Consumable account manager, even for existing Consumable publishers. Please reach out to your account manager to enable Prebid.js for your account.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placement` | required | The placement ID from Consumable. | `"1234567"` |
| `unitId` | required | The unit ID from Consumable. | `"1234"` |
| `unitName` | required | The unit name from Consumable. | `"cnsmbl-300x250"` |
| `zoneId` | required | The zone ID from Consumable. | `"13136.52"` |
