---
layout: bidder
title: AppNexus AST
description: Prebid AppNexus AST Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: appnexusAst
biddercode_longer_than_12: false
---

Advantages of using the `appnexusAst` adapter over the `appnexus`
adapter include:

- Requests all the adUnits at once, which reduces latency on page

- Supports additional formats (such as Video)

- Will continue to be upgraded as enhancements are made to Prebid.js
  for expanding capabilities

### bid params

{: .table .table-bordered .table-striped }
| Name                | Scope    | Description                                                                                                               | Example                                               |
|---------------------+----------+---------------------------------------------------------------------------------------------------------------------------+-------------------------------------------------------|
| `placementId`       | required | The placement ID from AppNexus.  You may identify a placement using the `invCode` and `member` instead of a placement ID. | `"234234"`                                            |
| `allowSmallerSizes` | optional | If `true`, ads smaller than the values in your ad unit's `sizes` array will be allowed to serve. Defaults to `false`.     | `true`                                                |
| `keywords`          | optional | A set of key-value pairs applied to all ad slots on the page.  Mapped to query string segments for buy-side targeting.    | `keywords: { genre: ['rock', 'pop'] }`                |
| `video`             | optional | Video targeting parameters.  See the [video section below](#appnexus-ast-video) for details.                              | `video: { playback_method: ['auto_play_sound_off'] }` |
| `invCode`           | optional | The inventory code from AppNexus. Must be used with `member`.                                                             | `"abc123"`                                            |
| `member`            | optional | The member ID  from AppNexus. Must be used with `invCode`.                                                                | `"12345"`                                             |

(Sizes set in `adUnit` object will also apply to the AppNexus bid requests.)

<a name="appnexus-ast-video"></a>

#### video

The following video parameters are supported.  For more information, see the video parameters in the [OpenRTB specification](http://www.iab.com/wp-content/uploads/2016/01/OpenRTB-API-Specification-Version-2-4-DRAFT.pdf).

+ `mimes`: An array of strings listing the content MIME types supported, e.g., `["video/x-flv", "video/x-ms-wmv"]`.

+ `minduration`: An integer that defines the minimum video ad duration, in seconds.

+ `maxduration`: An integer that defines the maximum video ad duration, in seconds.

+ `startdelay`: An integer that determines whether the ad should be shown before, during, or after the video content.  If the value is greater than 0, the position is mid-roll and the value indicates the start delay, in seconds.  Defaults to 0.
    + Pre-roll: `0`
    + Mid-roll: `-1`
    + Post-roll: `-2`

+ `skippable`: A boolean which, if `true`, means the user can click a button to skip the video ad.  Defaults to `false`.

+ `playback_method`: An array of strings listing the playback methods supported by the publisher.  Allowed values:
    +  `"auto_play_sound_on"`
    +  `"auto_play_sound_off"`
    +  `"click_to_play"`
    +  `"mouseover"`
    +  `"auto_play_sound_unknown"`

+ `frameworks`: An array of integers listing the API frameworks supported by the publisher. Allowed values:
    + None: `0`
    + VPAID 1.0: `1`
    + VPAID 2.0: `2`
    + MRAID 1.0: `3`
    + ORMMA: `4`
    + MRAID 2.0: `5`
