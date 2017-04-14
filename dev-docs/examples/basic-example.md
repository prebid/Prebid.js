---
layout: example
title: Examples
description: Basic Prebid.js Example

top_nav_section: dev_docs
nav_section: quick-start


about:
- <a href="/blog/dfp-instant-load">Instant Load</a> integration with DFP GPT single request asynchronous mode
- One set of line items for all bidders, or for each bidder (Both setups work with this example)
- Standard keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#bidderSettingsDefault">reference</a>).
- Standard price granularity

jsfiddle_link: jsfiddle.net/prebid/bhn3xk2j/458/embedded/html,result

code_lines: 110
code_height: 2389

pid: 10
---

<br>

<div markdown="1">
##### Line 6 to 27: Define timeout and ad units

This section is the only prebid config you may need to update frequently when:

- adding new bidders
- introducing new ad units
- changing timeout settings

Some publishers put this section of the code into a separate JS file for ad ops to own and manage.

</div>

<br>

<div markdown="1">

##### Line 8 to 26: Define ad units and bidder tag Ids

Register all your ad units in page here. The key `code` is an identifier of this ad unit. If you're using GPT, we recommend putting in that ad unit's slot element ID. If you don't put in the slot element ID, `pbjs.setTargetingForGPTAsync()` would not work, but you can still manually set targeting using `pbjs.getAdserverTargeting()` or `pbjs.getBidResponses()` ([API Reference](/dev-docs/publisher-api-reference.html)).

For each ad unit, register the header bidding bidders' tag Ids. For example in this case, the first ad unit has AppNexus and Sovrn bidding, and the second ad unit has Rubicon bidding. You can find the complete reference on [bidder params here](/dev-docs/bidders.html).

</div>

<br><br>

<div markdown="1">

##### Line 30 and Below: Boilerplate. No Need To Change.

</div>

<br>

<div markdown="1">

##### Line 35: Load the Prebid.js library Asynchronously

Generate your version of Prebid.js with the selected adaptors [here](http://prebid.org/download.html). Do not use the prebid.js version on the left in your production environment.

</div>

<br>

<div markdown="1">
##### Line 40: Googletag `disableInitialLoad()`

See full documentation from DFP [here](https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_disableInitialLoad).

- Ads will be requested with a `googletag.pubads().refresh()` call. See line 55 in the `sendAdserverRequest()` call.
- This should be set prior to enabling the service.
- GPT's Async mode must be used.

</div>

<div markdown="1">

##### Line 45 to 47: If all requested bids are back early, send out GPT ad request

Prebid.js sends out all registerd bid requests at `pbjs.requestBids()`.
Callback `bidsBackHandler` will be triggered when all bids are back for the requested ad units. 

</div>

<br>

<div markdown="1">

##### Line 51 to 52: ensure `sendAdserverRequest()` only called once

Send out GPT ad request when all bids are back, or when timeout is hit, whichever comes earlier.

<div markdown="1">

##### Line 55 to 56: Set key-values before GPT `refresh()` to send ad requests to DFP

This refresh call will trigger GPT to send out the ad request for all the defined ad units on page. It's important to pair this with `disableInitialLoad()`, as in line 40.

Call `pbjs.setTargetingForGPTAsync()` before the refresh call to let prebid.js attach all the bids to the ad units.

</div>

<div markdown="1">

##### Line 61 to 63: set timeout to timebox bidders' bids

The page will only asynchronously wait for PREBID_TIMEOUT amount of time before it calls `sendAdserverRequest()` to let GPT send out the bids.

</div>

<br>

<div markdown="1">

##### Line 68 and below: your original page setup unchanged.

You don't have to change any other part of your page, such as GPT loading or GPT tags definition.


