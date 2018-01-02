---
layout: bidder
title: Conversant
description: Prebid Conversant Bidder Adaptor 
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: conversant
biddercode_longer_than_12: false
prebid_1_0_supported : true
---



### bid params

{: .table .table-bordered .table-striped }

| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `site_id` | required | The site ID from Conversant. | `"87293"` |
| `secure` | required (For Secure Pages) | If impression requires secure HTTPS URL creative assets and markup. 0 for non-secure, 1 for secure. Default is non-secure | `"secure":1` |
| `bidfloor` | optional | Bid floor | `0.50` |
| `tag_id` | optional | Identifies specific ad placement. | `cnvr-test-tag` |
| `position` | optional | Ad position on screen. See details below. | `1` |
| `mimes` | optional | Array of content MIME types supported. Required for video| `[video/mp4]`|
| `maxduration` | optional | Maximum duration in seconds for this video as an integer. | `30` |
| `api` | optional | Array of supported API frameworks. See details below. | `[2]` |
| `protocols` | optional | Array of supported video protocols. See details below. | `[2]` |


The following values are defined in the [ORTB 2.5 spec](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf).

### position

+ `0` : Unknown 
+ `1` : Above the Fold
+ `3` : Below the Fold
+ `4` : Header
+ `5` : Footer
+ `6` : Sidebar
+ `7` : Full Screen

### api

+ `1` : VPAID 1.0
+ `2` : VPAID 2.0
+ `3` : MRAID 1.0
+ `4` : ORMMA
+ `5` : MRAID 2.0
+ `6` : MRAID 3.0

### protocols
+ `1` : VAST 1.0
+ `2` : VAST 2.0
+ `3` : VAST 3.0
+ `4` : VAST 1.0 Wrapper
+ `5` : VAST 2.0 Wrapper
+ `6` : VAST 3.0 Wrapper
+ `7` : VAST 4.0
+ `8` : VAST 4.0 Wrapper
+ `9` : DAAST 1.0
+ `10` : DAAST 1.0 Wrapper
