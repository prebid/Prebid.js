---
layout: example
title: Examples
description: Basic Prebid.js Example with DFP GPT

top_nav_section: dev_docs
nav_section: quick-start

about:
- Integration with DFP's GPT single request asynchronous mode.
- One set of line items for all bidders
- Standard keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#bidderSettingsDefault">reference</a>).
- Standard price granularity (pbMg see <a href="/dev-docs/publisher-api-reference.html#bidResponse">reference here</a>).

jsfiddle_link: jsfiddle.net/prebid/9ow4k8j6/30/embedded/html,result
code_height: 1890
code_lines: 101

pid: 10
---


<br>
<br>
<br>
<br>

<div markdown="1">
#### Line 4 to 23: Set ad server timeout

`setTimeout(initAdserver, PREBID_TIMEOUT)` tells the page's Javascript to asynchronously wait for the amount of time specified in the `PREBID_TIMEOUT` variable before loading the GPT library. Any bidder that takes longer loses the chance to bid. SetTimeout is asynchronous so that your page content continues to load.

<div class="bs-callout" markdown="1">
##### Why wrap the GPT library instead of the `.display()` calls?

Because GPT sends out all of the the impressions at the first `googletag.display()` function call, wrapping every single `.display()` calls in a `setTimeout` function is unrealistic. Instead, the easiest way we have found is to wrap the GPT library loading call in the `setTimeout` function. This way, your page's existing GPT implementation is left intact.
</div>

</div>


<br>
<br>
<br>


<div markdown="1">

#### Line 25 to 34: Load the Prebid.js library Asynchronously

Line 26 defines an command queue for prebid.js, so that prebid commands can be added before the prebid.js library loads.

This code pulls down the prebid.js library asynchronously from the appropriate CDN and inserts it into the page.

</div>

<br>
<br>
<br>

<div markdown="1">

#### Line 36: wrap prebid commands with the queue push

It's important to wrap all prebid commands by `pbjs.que.push`. This is because the prebid.js library loads asynchronously and may load after the command has been added.

</div>


<br>
<br>

<div markdown="1">

#### Line 37 to 58: Define ad units and bidder tag Ids

Register all your ad units in page here. The key `code` is an identifier of this ad unit. If you're using GPT, we recommend putting in that ad unit's slot element ID. If you don't put in the slot element ID, `pbjs.setTargetingForGPTAsync()` would not work, but you can still manually set targeting using `pbjs.getAdserverTargeting()` or `pbjs.getBidResponses()` ([API Reference](/dev-docs/publisher-api-reference.html)).

For each ad unit, register the header bidding bidders' tag Ids. For example in this case, the first ad unit has AppNexus and Sovrn bidding, and the second ad unit has Rubicon bidding. You can find the complete reference on [bidder params here](/dev-docs/bidders.html).

</div>

<br>
<br>
<br>
<br>
<br>
<br>

<div markdown="1">

#### Line 60 to 64: Request bids for the registered ad units

Prebid.js will send out header bidding requests to all registered bidders once `pbjs.requestBids` is called. `bidsBackHandler` is a callback that will trigger when all registered bids for the ad units are back. `initAdserver()` is registered for this callback, because in case all bidders respond faster than the timeout `PREBID_TIMEOUT`, the impression will directly go to the ad server without having to waste time.

`pbjs.requestBids` can also be used for refreshing selected ad units. It could be handy for infinite scrolling ad units. Check out the complete [reference here](/dev-docs/publisher-api-reference.html#module_pbjs.requestBids).

</div>

<br>
<br>

<div markdown="1">

#### Line 74 to 76: Set keyword targeting

At this point, either the timeout has hit or all prebid bidders have responded. This is a good time to set the keyword targeting and send the impression to the ad server. In this example, `pbjs.setTargetingForGPTAsync()` selects the highest bid among all available ones for each ad unit, and automatically sets targeting on your ad units. Note that the function has to be called after all your GPT slots have been defined.

If you prefer to manually set the prebid keywords targeting, you can get the bid information through `pbjs.getAdserverTargeting()` or `pbjs.getBidResponses()` ([API Reference](/dev-docs/publisher-api-reference.html)).


</div>

