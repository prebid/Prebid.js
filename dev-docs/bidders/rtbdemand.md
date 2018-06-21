---
layout: bidder
title: Rtbdemand bidder
description: Prebid Rtbdemand Media Bidder Adapter
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: rtbdemand
biddercode_longer_than_12: false
---

### bid params

{: .table .table-bordered .table-striped }

| Name   | Scope    | Description                                                                        | Example                                                      |
| :------| :--------| :--------------------------------------------------| :------------------------------------|
| zoneid | required | The ad zone or tag specific ID                                     | `"9999"`                                                     |
| floor  | optional | The floor CPM price for the request                                | `0.1234`                                                     |
| server | optional | Bidder domain                                                                      | `"bidding.rtbdemand.com" by default`  |
