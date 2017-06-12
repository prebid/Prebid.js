---
layout: bidder
title: AdSupply
description: Prebid AdSupply Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: adsupply

biddercode_longer_than_12: false

---



### Note:
The AdSupply adapter requires setup and approval from the AdSupply team, even for existing AdSupply publishers. Please reach out to your account representative or support@adsupply.com for more information.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `clientId` | required | AdSupply client identifier. Provided by AdSupply. | `"b367CB268B1094004A3689751E7AC568F"` |
| `siteId` | required | AdSupply site identifier. Provided by AdSupply. | `"9e3ba26d-eaac-4004-9c7d-c0ac269d0cf2"` |
| `zoneId` | required | AdSupply zone identifier. A zone entity manages caps, sizes, etc. Provided by AdSupply. | `28384` |
| `endpointUrl` | required | AdSupply engine domain. | `engine.4dsply.com` |
