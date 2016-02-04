---
layout: page
title: How to reduce latency
head_title: How to reduce latency of header bidding with prebid.js

description: A walkthrough of why header bidding implementations cause latency. An overview of how to use prebid.js to reduce it.

pid: 40

top_nav_section: overview
nav_section: studies

---

<div class="bs-docs-section" markdown="1">

# How to reduce latency of header bidding


> Why do header bidding cause latency? How to reduce it?

Having seen almost all bidders' header bidding API calls, we've observed the few problems listed below:

* Many bidders can NOT load their Javascript library asynchronously.
* Publishers make more money if all bidders are treated fairly. However, bidders that offer asynchronous integrations today (better for the publisher) are given LESS time to respond. 
* Blocking ad calls is bad for user experience. Users leave the site if content takes too long to load.

Here're a few screenshots of websites' network calls after implemented header bidding. In a later section, there's a screenshot showing how header bidding is accelerated by prebid.js.

#### Blocking Call Screenshot 1

![Blocking Ad Calls 1]({{ site.github.url }}/assets/images/icons/latency-blocking-1.png)

* All header bidding requests combined took 4 seconds to load!
* Users have to wait for 4 seconds of blank space in their web browser before any content can load.

<br> 

#### Blocking Call Screenshot 2

![Blocking Ad Calls 1]({{ site.github.url }}/assets/images/icons/latency-blocking-2.png)

* All header bidding requests in total took 1 second to load. 
* However, if all calls are made asynchrnously, latency can be dramatically reduced.

<br>

### After prebid.js's acceleration:

![Blocking Ad Calls 1]({{ site.github.url }}/assets/images/icons/latency-concurrent.png)

* ##### All Pre-bid Calls are made concurrently within 100ms.

	Note that AppNexus, Pubmatic, OpenX, Rubicon header bidding calls were all made within the first 100ms. 

* ##### Timeout at 400ms is respected.

	We set the timeout to 400ms. As you can see from the graph, the GPT tag (gpt.js) is loaded at around 500ms. The reason that GPT didn't get loaded exactly at 400ms is Javascript's timer is underterministic. Some partners take longer than the others. The ones that took longer than the timeout setting did not get a chance to bid due to latency concerns.

* ##### Rotate order of bidders

	To help publishers maximize yield, all header bidders should be given the same amount of time to respond. However, Javascript doesn't make calls exactly at the same time, so we help you rotate the order that the bidders get called.

</div>