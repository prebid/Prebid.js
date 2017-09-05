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

### bid params: Video
{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `video` | required | Video parameters.  See [video params table](#index-video) | `{"siteID": 12345, "playerType":"HTML5", "protocols":[2,3,5,6], "maxduration":15}`  |

<a name="index-video"></a>

### Video params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `siteID` | required | Publisher site ID | `12345` |
| `playerType` | required | String representing video player type, either HTML5 or FLASH | `"HTML5"` |
| `protocols` | required | Array of integers representing VAST versions supported by the player, as defined in OpenRTB 2.3 section 5.6 | `[2, 3, 5, 6]` |
| `maxduration` | required | Integer representing allowable max duration of the video ad, in seconds | `15` |
| `minduration` | optional | Integer representing allowable min duration of the video ad, in seconds.  Default of 0 assumed if none is specified. | `5` |
| `startdelay` | optional | Defines the start of the ad, when a string is specified then generic RTB values are used, when a number is specified then is interpreted as the number of seconds into the content video at which the ad should play.  Default assumed to be `preroll` if none specified | `"preroll"` |
| `linearity` | optional |  String representing whether video ad is linear or overlay.  Defaults to `"linear"` if not defined | `"linear"` |
| `mimes` | optional | Array of strings representing player supported mime types. Overrides the supported MIME types otherwise inferred by `playerType` setting. | `["video/mp4", "video/webm"]` |
| `allowVPAID` | optional | Boolean defining whether player supports any version of VPAID.  Which versions are supported is inferred from `playerType`.  Defaults to false | `false` |
| `apiList` | optional | Array of integers representing player supported VPAID versions, as defined in OpenRTB 2.3 section 5.6.  Overrides versions inferred from `playerType`.  | `[1, 2]` |