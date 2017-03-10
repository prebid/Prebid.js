---
layout: bidder
title: Rubicon
description: Prebid Rubicon Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: rubicon

biddercode_longer_than_12: false

---



### Note:
The Rubicon Fastlane adapter requires setup and approval from the Rubicon Project team, even for existing Rubicon Project publishers. Please reach out to your account team or globalsupport@rubiconproject.com for more information and to enable using this adapter.

### bid params

{: .table .table-bordered .table-striped }
| Parameter | Version | Scope | Description | Example |
| :--- | :------ | :---- | :---------- | :------ |
| `accountId` | 0.6.0 | required | The publisher account ID | `"4934"` |
| `siteId` | 0.6.0 | required | The site ID | `"13945"` |
| `zoneId` | 0.6.0 | required | The zone ID | `"23948"` |
| `sizes` | 0.6.0 | optional | Array of Rubicon Project size IDs. If not specified, the system will try to convert from bid.sizes. | `[15]` |
| `keywords` | 0.6.0 | optional | Array of page-specific keywords. May be referenced in Rubicon Project reports. | `["travel", "tourism"]` |
| `inventory` | 0.6.0 | optional | An object defining arbitrary key-value pairs concerning the page for use in targeting. | `{"rating":"5-star", "prodtype":"tech"}` |
| `visitor` | 0.6.0 | optional | An object defining arbitrary key-value pairs concerning the visitor for use in targeting. | `{"ucat":"new", "search":"iphone"}` |
| `position` | 0.6.0 | optional | Set the page position. Valid values are "atf" and "btf". | `"atf"` |
| `userId` | 0.6.0 | optional | Site-specific user ID may be reflected back in creatives for analysis. Note that userId needs to be the same for all slots. | `"12345abc"` |
| `floor` | 0.19.0 | optional | Sets the global floor -- no bids will be made under this value. | `0.50` |
| `video` | 0.19.0 | optional | Video targeting parameters. See the [video section below](#rubicon-video). | `{"language": "en", "playerHeight": "360", "playerWidth": "640", "size_id": "201"}` |

<a name="rubicon-video"></a>

#### Video

The following video parameters are supported as of 0.19.0:

{: .table .table-bordered .table-striped }
| Video Parameter | Scope | Description | Example |
| :-------------- | :---- | :---------- | :------ |
| `playerWidth` | optional | Video player width in pixels | `"playerWidth": "640"` |
| `playerHeight` | optional | Video player height in pixels | `"playerHeight": "360"` |
| `size_id` | optional | Integer indicating the video ad format ID:<br/><br/>201: Pre-Roll<br/>202: Interstitial <br/>203: OutStream <br/>204: Mid-Roll <br/>205: Post-Roll <br/>207: Vertical Video | `"size_id": "201"` |
| `language` | optional | Indicates the language of the content video, in ISO 639-1/alpha2. Highly recommended for successful monetization for pre-, mid-, and post-roll video ads. Not applicable for interstitial and outstream. | `"language": "en"` |
| aeParams | optional | Optional parameter that enables overriding of pre-defined video options in account setup. Some common samples are shown below. Additional options are available by contacting your account team. | |
| `aeParams.p_aso.video.ext.skip` | optional | Defines whether the user can skip the ad. Defaults to non-skippable. Set to 1 to indicate skippable. | `"aeParams": {"p_aso.video.ext.skip": "1"}` |
| `aeParams.p_aso.video.ext.skipdelay` | optional | If the ad is skippable, this is an integer duration (in seconds) after which the user has the option to skip the ad. Default is 0. | `"aeParams": {"p_aso.video.ext.skipdelay": "15"}` |
| `aeParams.p_aso.video.ext.maxbitrate` | optional | Integer indicating maximum bitrate of video ad in kbps. | `"aeParams": {"p_aso.video.ext.maxbitrate": "1200"}` |
| `aeParams.p_aso.video.ext.minbitrate` | optional | Integer indicating minimum bitrate of video ad in kbps. | `"aeParams": {"p_aso.video.ext.minbitrate": "400"}` |
| `aeParams.p_aso.video.ext.boxingallowed` | optional | Integer indicating whether the seller permits letterboxing. The default is "1", -- letterboxing is permitted. "0" indicates it is not permitted. | `"aeParams": {"p_aso.video.ext.boxingallowed": "1"}` |
