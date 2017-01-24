---
layout: bidder
title: OpenX
description: Prebid OpenX Bidder Adaptor

top_nav_section: dev_docs
nav_section: reference

hide: true

biddercode: openx

biddercode_longer_than_12: false

---



### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `unit` | required | The ad unit ID provided by OpenX | "538562284" |
| `delDomain` | required | The publisher specific domain provided by OpenX | "clientname-d.openx.net" |
| `customParams` | optional | Permits passing any publisher key-value pairing into the bid request | {"gender": "female"} |
