---
layout: bidder
title: Criteo
description: Prebid Criteo Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: criteo

biddercode_longer_than_12: false

bidder_supports_deals: false
media_types: native

---


### bid params

{: .table .table-bordered .table-striped }
| Name              | Scope    | Description                                                                                                          | Example                                       |
| :---              | :----    | :----------                                                                                                          | :------                                       |
| `zoneId`          | required | The zone ID from Criteo. Can be replaced by `networkId` when using zone matching.                                    | `234234`                                      |
| `networkId`       | optional | The network ID from Criteo.Please reach out your Criteo representative for more details.                             | `456456`                                      |
| `nativeCallback`  | optional | Callback to perform render in native integrations. Please reach out your Criteo representative for more details.     | `function(payload) { console.log(payload); }` |
| `integrationMode` | optional | Integration mode to use for ad render (none or 'AMP'). Please reach out your Criteo representative for more details. | `"AMP"`                                       |
