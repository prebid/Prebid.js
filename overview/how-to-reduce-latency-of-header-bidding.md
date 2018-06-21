---
layout: page
title: How to reduce the latency of header bidding with Prebid.js
head_title: How to reduce the latency of header bidding with Prebid.js
description: A walkthrough of why header bidding implementations cause latency. An overview of how to use Prebid.js to reduce it.
pid: 40
top_nav_section: overview
nav_section: studies
---

<div class="bs-docs-section" markdown="1">

# How to reduce the latency of header bidding with Prebid.js
{:.no_toc}

> Why does header bidding cause latency? How can we reduce it?

Having seen almost all bidders' header bidding API calls, we've observed the few problems listed below:

* Many bidders cannot load their Javascript library asynchronously.
* Publishers make more money if all bidders are treated fairly. However, bidders that offer asynchronous integrations today (better for the publisher) are given less time to respond.
* Blocking ad calls are bad for user experience. Users leave the site if content takes too long to load.

The first two scenarios show websites' network calls after implementing header bidding.

The final scenario shows how header bidding is accelerated by Prebid.js.

* TOC
{:toc}

## Blocking Call Scenario 1

{: .pb-lg-img :}
![Blocking Ad Calls 1]({{ site.github.url }}/assets/images/icons/latency-blocking-1.png)

* In this scenario, all header bidding requests combined took 4 seconds to load!
* Users have to wait for 4 seconds of blank space in their web browser before any content can load.

<br /> 

## Blocking Call Scenario 2

{: .pb-lg-img :}
![Blocking Ad Calls 2]({{ site.github.url }}/assets/images/icons/latency-blocking-2.png)

* In this scenario, all header bidding requests in total took 1 second to load.
* However, if all of the calls were made asynchronously, latency could still be dramatically reduced.

<br />

## Asynchronous Call Scenario with Prebid.js

{: .pb-lg-img :}
![Prebid ad calls made concurrently]({{ site.github.url }}/assets/images/icons/latency-concurrent.png)

* *All Pre-bid Calls are made concurrently within 100ms*: Note that AppNexus, Pubmatic, OpenX, Rubicon bidding header calls were all made within the first 100ms. 

* *The timeout of 400ms is respected*: We set the timeout to 400ms. As you can see from the graph, the GPT tag (`gpt.js`) is loaded at around 500ms. The reason that GPT didn't get loaded exactly at 400ms is that the JavaScript timer is nondeterministic. Some partners take longer than others. The ones that took longer than the timeout setting did not get a chance to bid due to latency concerns.

* *Rotate order of bidders*: To help publishers maximize yield, all header bidders should be given the same amount of time to respond. However, JavaScript doesn't make calls exactly at the same time, so we help you rotate the order in which the bidders are called.

## Further Reading

+ [Getting Started]({{site.baseurl}}/overview/getting-started.html)

</div>
