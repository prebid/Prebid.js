---
layout: example
title: Send All Bids
description: Send all bids to the ad server

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- One set of line items for each bidder
- Send all bids mode keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#module_pbjs.enableSendAllBids">reference here</a>)
- Send all bids to the ad server so you can track historical bid prices from various bidders in reporting
- Standard price granularity
- Standard integration with DFP's GPT single request asynchronous mode

jsfiddle_link: jsfiddle.net/prebid/qu68xoz5/3/embedded/html,result

code_lines: 121
code_height: 2641

pid: 15
---

<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />

<div markdown="1">

#### Line 32: Enable the mode for sending all bids to the ad server

At this point, either the timeout has hit or all prebid bidders have responded. This is a good time to let prebid.js know that the ad server keywords it generates should be for all bids.

+ `pbjs.enableSendAllBids()` lets prebid.js know that the ad server keywords it generates should be for ALL bids, not just for the top winning bid.

+ It must be called *before* calling `pbjs.setTargetingForGPTAsync()` or `pbjs.getAdserverTargeting()`. 

+ `pbjs.setTargetingForGPTAsync()`, with sendAllBids enabled, will now attach bid keywords for all bids, instead of just the top winning bid, to the ad server requests. Your ad server will see all the bids, make the ultimate decision on which one will win, and generate reporting on historical bid prices from all bidders.

If you prefer to manually set the prebid keyword targeting, you can get the bid information through `pbjs.getAdserverTargeting()` or `pbjs.getBidResponses()`.

For more information about these methods, see the [Publisher API Reference](/dev-docs/publisher-api-reference.html#module_pbjs.enableSendAllBids).

</div>
