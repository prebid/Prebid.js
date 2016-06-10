---
layout: example
title: DFP Instant Load
description: Prebid.js Instant Load with DFP GPT

top_nav_section: dev_docs
nav_section: quick-start

hide: true

why_link: /blog/dfp-instant-load

about:
- <strong>Instant Load</strong> integration with DFP GPT single request asynchronous mode.
- One set of line items for all bidders, or for each bidder. (Both setups work with this example)
- Standard keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#bidderSettingsDefault">reference</a>).
- Standard price granularity (pbMg see <a href="/dev-docs/publisher-api-reference.html#bidResponse">reference here</a>).

jsfiddle_link: jsfiddle.net/prebid/bhn3xk2j/2/embedded/html,result

code_lines: 109
code_height: 2389

pid: 10
---


<br><br><br>
<br><br><br>
<br><br><br>

<div markdown="1">
#### Line 6 to 27: Define timeout and ad units

This section is the only prebid config you may need to update frequently when:

- adding new bidders
- introducing new ad units
- changing timeout settings

Some publishers put this section of the code into a separate JS file for ad ops to own and manage.

</div>


<br><br><br><br>
<br><br><br><br>
<br><br><br><br>
<br>

<div markdown="1">

#### Line 31: Load the Prebid.js library Asynchronously

Generate your version of Prebid.js with the selected adaptors [here](http://prebid.org/download.html). Do not use the prebid.js version on the left in your production environment.

</div>

<br>

<div markdown="1">
#### Line 33 to 37: Googletag `disableInitialLoad()`

See full documentation from DFP [here](https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_disableInitialLoad).

- Ads will be requested with a `googletag.pubads().refresh()` call. See line 55 in the `sendAdserverRequest()` call.
- This should be set prior to enabling the service.
- GPT's Async mode must be used.



</div>


<br>

<div markdown="1">

#### Line 44 to 46: If all requested bids are back early, send out GPT ad request

Callback `bidsBackHandler` will be triggered when all bids are back for the requested ad units. 

</div>

<br>

<div markdown="1">

#### Line 50 to 51: ensure `sendAdserverRequest()` only called once

Send out GPT ad request when all bids are back, or when timeout is hit, whichever comes earlier.

<br>

<div markdown="1">

#### Line 54 to 55: GPT `refresh()` to send ad requests to DFP

This refresh call will trigger GPT to send out the ad request for all the defined ad units on page. It's important to pair this with `disableInitialLoad()`, as in line 36. 

Call `pbjs.setTargetingForGPTAsync()` before the refresh call to let prebid.js attach all the bids to the ad units.

</div>

<br>

<div markdown="1">

#### Line 60 to 62: set timeout to timebox bidders' bids

The page will only asynchronously wait for PREBID_TIMEOUT amount of time before it calls `sendAdserverRequest()` to let GPT send out the bids.

</div>

<br><br><br><br>

<div markdown="1">

#### Line 67 and beyond: your original page setup unchanged.

Unlike in [Basic Example](basic-example.html), you no longer have to change any other part of your page, such as GPT loading or GPT tags definition.


