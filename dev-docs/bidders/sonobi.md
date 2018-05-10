---
layout: bidder
title: Sonobi
description: Prebid Sonobi Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: sonobi
biddercode_longer_than_12: false
prebid_1_0_supported : true
media_types: video
---

### Note:
The Sonobi Bidder adapter requires setup and approval from your Sonobi Account Manager. If you require assistance 
implementing our adapter please don't hesitate to contact us at apex.prebid@sonobi.com.

### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                                                    | Type          | Example                          |
|:---------------|:---------|:---------------------------------------------------------------|:--------------|:---------------------------------|
| `placement_id` | required | The placement ID                                               | String        | `'1a2b3c4d5e6f1a2b3c4d'`         |
| `ad_unit`      | required | The adunit ID                                                  | String        | `'/1234567/example/adUnit/code'` |
| `floor`        | optional | Bid floor for this placement in USD                            | Integer       | `0.50`                           |
| `sizes`        | optional | Adunit sizes that will override global sizes                   | Array[String] | `[[300, 250], [300, 600]]`       |
| `hfa`          | optional | Publisher Unique Identifier                                    | String        | `'123985'`                       |
| `referrer`     | optional | Overrides the default value for the ref param in a bid request | String        | `'prebid.org'`                       |

### Configuration

The `ad_unit` and `placement_id` are **mutually exclusive** but at least one is required. If you pass both, `ad_unit` takes precedence. 

If you pass the optional `sizes` Array in your bid params it will override the global config sizes for the Sonobi Adapter only.

The `hfa` parameter requires your Sonobi Account Manager to enable this feature for you. Please contact them for further information.

### Video Example
[Sonobi Video](http://prebid.org/examples/bidders/sonobi-video-example.html)
