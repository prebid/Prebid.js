---
layout: bidder
title: Smart
description: Prebid Smart Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: smartadserver

biddercode_longer_than_12: false

prebid_1_0_supported: true
media_types: video
gdpr_supported: true

---

### Note:
The Smart bidder adaptor requires setup and approval from the Smart Service team. Please reach out to your account manager for more information and start using it.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `domain` | required | The network domain | `'http://prg.smartadserver.com', 'https://prg.smartadserver.com'` |
| `siteId` | required | The placement site ID | `1234` |
| `pageId` | required | The placement page ID | `1234` |
| `formatId` | required | The placement format ID | `1234` |
| `target` | optional | The keyword targeting | `"sport=tennis"` |
| `currency` | optional | Override the default currency code (ISO 4217) of the ad request. (Default: `"USD"`) | `"EUR"` |
| `bidfloor` | optional | Bid floor for this placement in USD or in the currency specified by the `currency` parameter. (Default: `0.0`) | `0.42` |
| `appName` | optional | Mobile application name | `Smart AdServer Preview` |
| `buId` | optional | Mobile application bundle ID | `com.smartadserver.android.dashboard` |
| `ckId` | optional | Unique Smart user ID | `1234567890123456789` |
