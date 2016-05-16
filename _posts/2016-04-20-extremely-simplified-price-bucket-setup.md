---
layout: post
title: Extremely Simplified Price Bucket Setup

description: Setting up price buckets is now extremely simplified. Define header bidding price granularity in a single line.

permalink: /blog/extremely-simplified-price-bucket-setup

---

### New API for `pbjs.setPriceGranularity()`
`pbjs.setPriceGranularity` is a Prebid API method to configure which price bucket is used for "hb_pb". The accepted values are, "low", "medium", "high" and "auto", with "medium" being the default. Also introduces the "auto" price bucket which applies a sliding scale to determine granularity as:

{: .table .table-bordered .table-striped }
| cpm | granularity |
|---|---|
| cpm < 5 | .05 increments |
| cpm > 5 and < 10 | .10 increments |
| cpm > 10 and < 20 | .50 increments | 
| cpm > 20 | pb capped at 20 |
