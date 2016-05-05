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

<br>
<br>
<br>
<br>
<br>
<br>

<div markdown="1">

#### Line 4 to 24: Set ad server timeout

`setTimeout(initAdserver, PREBID_TIMEOUT)` tells the page's Javascript to asynchronously wait for the amount of time specified in the `PREBID_TIMEOUT` variable before loading the GPT library. Any bidder that takes longer loses the chance to bid. SetTimeout is asynchronous so that your page content continues to load.

<div class="bs-callout" markdown="1">

##### Why wrap the GPT library instead of the `.display()` calls?

Because GPT sends out all of the the impressions at the first `googletag.display()` function call, wrapping every single `.display()` calls in a `setTimeout` function is unrealistic. Instead, the easiest way we have found is to wrap the GPT library loading call in the `setTimeout` function. This way, your page's existing GPT implementation is left intact.
</div>

</div>

<br>
<br>

<div markdown="1">

#### Line 26 to 35: Load the Prebid.js library Asynchronously

We define a command queue for Prebid.js, so that prebid commands can be added before the library loads.

This code pulls down the library asynchronously from the CDN and inserts it into the page.

</div>

<br>
<br>
<br>

<div markdown="1">

#### Line 37: wrap prebid commands with the queue push

It's important to wrap all prebid commands by `pbjs.que.push`. This is because the prebid.js library loads asynchronously and may load after the command has been added.

</div>


<br>
<br>

<div markdown="1">

#### Line 38 to 59: Define ad units and bidder tag Ids

Register all your ad units in page here. The key `code` is an identifier of this ad unit. If you're using GPT, we recommend putting in that ad unit's slot element ID. If you don't put in the slot element ID, `pbjs.setTargetingForGPTAsync()` would not work, but you can still manually set targeting using `pbjs.getAdserverTargeting()` or `pbjs.getBidResponses()` ([API Reference](/dev-docs/publisher-api-reference.html)).

For each ad unit, register the header bidding bidders' tag Ids. For example in this case, the first ad unit has AppNexus and Sovrn bidding, and the second ad unit has Rubicon bidding. You can find the complete reference on [bidder params here](/dev-docs/bidders.html).

</div>

<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>

<div markdown="1">

#### Line 62 to 67: Request bids for the registered ad units

Prebid.js will send out header bidding requests to all registered bidders once `pbjs.requestBids` is called. `bidsBackHandler` is a callback that will trigger when all registered bids for the ad units are back. `initAdserver()` is registered for this callback, because in case all bidders respond faster than the timeout `PREBID_TIMEOUT`, the impression will directly go to the ad server without having to waste time.

`pbjs.requestBids` can also be used for refreshing selected ad units. It could be handy for infinite scrolling ad units. Check out the complete [reference here](/dev-docs/publisher-api-reference.html#module_pbjs.requestBids).

</div>

<br>
<br>
<br>
<br>
<br>
<br>

<div markdown="1">

#### Line 76 to 80: Log all bids to the ad server and set keyword targeting

At this point, either the timeout has hit or all prebid bidders have responded. This is a good time to enable logging the bids from all bidders, set keyword targeting, and send everything on to the ad server.

+ `pbjs.enableSendAllBids()` logs all bid information to the ad server (not just the winning bid).  It must be called *before* calling `pbjs.setTargetingForGPTAsync()`.  This will allow you to track historical bid prices from various bidders in reporting.
+ `pbjs.setTargetingForGPTAsync()` selects the highest bid among all available ones for each ad unit, and automatically sets targeting on your ad units. Thus has to be called after all your GPT slots have been defined.

If you prefer to manually set the prebid keyword targeting, you can get the bid information through `pbjs.getAdserverTargeting()` or `pbjs.getBidResponses()`.  For more information, see the [Publisher API Reference](/dev-docs/publisher-api-reference.html).

</div>
