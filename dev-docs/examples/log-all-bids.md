---
layout: example
title: Log all bids
description: Log all bids to the ad server with Prebid.js

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- Integration with DFP's GPT single request asynchronous mode.
- One set of line items for all bidders
- Standard keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#bidderSettingsDefault">reference</a>).
- Standard price granularity (pbMg see <a href="/dev-docs/publisher-api-reference.html#bidResponse">reference here</a>).
- Log all bids to the ad server so you can track historical bid prices from various bidders in reporting.

jsfiddle_link: jsfiddle.net/prebid/qu68xoz5/2/embedded/html,result

code_lines: 105
code_height: 2276

pid: 0
---

{% include dev-docs/build-from-source-warning.md %}

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

#### Line 76 to 80: Log all bids to the ad server and set keyword targeting

At this point, either the timeout has hit or all prebid bidders have responded. This is a good time to enable logging the bids from all bidders, set keyword targeting, and send everything on to the ad server.

+ `pbjs.enableSendAllBids()` logs all bid information to the ad server (not just the winning bid).  It must be called *before* calling `pbjs.setTargetingForGPTAsync()`.  This will allow you to track historical bid prices from various bidders in reporting.
+ `pbjs.setTargetingForGPTAsync()` selects the highest bid among all available ones for each ad unit, and automatically sets targeting on your ad units. Thus has to be called after all your GPT slots have been defined.

If you prefer to manually set the prebid keyword targeting, you can get the bid information through `pbjs.getAdserverTargeting()` or `pbjs.getBidResponses()`.  For more information, see the [Publisher API Reference](/dev-docs/publisher-api-reference.html).

</div>
