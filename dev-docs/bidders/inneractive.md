---
layout: bidder
title: Inneractive
description: Prebid Inneractive Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: inneractive

biddercode_longer_than_12: false

---



### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                         | Example |
| :------------- | :------- | :---------------------------------- | :------ |
| `appId`        | required | The app. ID provided by Inneractive                 | `Company_App_OS` |
| `adSpotType`   | required | The ad spot type                                    | `"BANNER" / "RECTANGLE"` |
| `customParams` | optional | Allows passing custom parameters in the bid request | `See more details at: https://confluence.inner-active.com/display/DevWiki/IA+Adapter+AdUnit+Bidder+Configuration` |
