---
layout: bidder
title: Sonobi
description: Prebid Sonobi Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: sonobi

biddercode_longer_than_12: false

---



### release version:
`0.8.0`

### bid params : DFP adUnit Code format

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `ad_unit` | required | The ad unit ID | "/1234567/example/adUnit/code" |
| `dom_id` | optional | The DOM Id of the ad slot | "div-gpt-ad-12345-0" |
| `floor` | optional | The numerical floor value desired | 1 |

### bid params : Sonobi Placement Id format

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placement_id` | required | The placement ID | "1a2b3c4d5e6f1a2b3c4d" |
| `dom_id` | optional | The DOM Id of the ad slot | "div-gpt-ad-12345-0" |
| `floor` | optional | The numerical floor value desired | 1 |

### Caveats

* Ask your account manager if you should use DFP adUnit code format or Sonobi Placement Id format
* If you require assistance with any of our open source code, please email support at github@sonobi.com
