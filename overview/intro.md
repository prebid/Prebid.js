---
layout: page
title: Intro
description: An overview of Prebid.js, how it works, basic templates and examples, and more for header bidding.
pid: 0

is_top_nav: yeah

top_nav_section: overview
nav_section: intro

---

<div class="bs-docs-section" markdown="1">

#Overview

### What is Prebid.js?

> Prebid.js is a 100% free and open source Javascript framework designed
to make it easier for publishers to run pre-bid auctions and get
access to more demand with minimal integration hassle.

Pre-bid auctions (also known as "header auctions" or "header bidding")
run directly on a publisher's page and allow publishers to access
external demand that may not be available through their primary ad
server.

The benefits of using Prebid.js to manage your header bidding partners are:

- Clean, built-in support for all major bidders as well as major ad
  servers.

- It solves many problems publishers are facing - high latency, unfair
  auction mechanics, long development time, and confusing line item
  and targeting setup.

- Plugging in prebid.js is easy. Adding new header bidding partners is
  a matter of adding tag IDs to your JSON config.

- 100% free and open source, giving you complete control over how you
  use it.



<br>

<a name="how-works">

### How it works?

At a high level, header bidding involves just a few steps:

1. The Prebid.js library fetches bids from various partners

2. Prebid.js passes information about those bids (including price) to
   the tag on page, which passes it to the ad server as query string
   parameters.

3. The ad server has line items targeting those parameters.

<br>

### Step by step

![Ad Ops Diagram]({{ site.github.url }}/assets/images/adops-intro.png)


##### 1. Call bidders asynchronously

* You configure prebid.js and setup one or more supported “bidders” (SSP, retargeters, ad networks, etc. – whatever they’re called)
* As the page loads, prebid.js will asynchronously call all bidders to request how much they’re willing to pay for the impression. Note: the asynchronous calls mean the pages’ content continues to render without interruption.

##### 2. Timer on page

* To prevent header bidding partners from taking too long, prebid.js enables you to set a timer to control how long the ad server should wait for the header bidding partners. If the header auction exceeds the timeout, the auction is skipped and the impression is sent to the ad server.


##### 3. Ad server requests with key-value targeting
* When bids are received, prebid.js adds the price and creative identifier to your ad server’s call as a set of query string parameters.

##### 4. Line items
* Within your ad server, line items are setup to target the various bid prices, allowing the bidders’ programmatic demand compete with other line items or integrated exchanges (like Google Ad Exchange) based on price. 

##### 5. Creative
* A small snippet of JavaScript is setup as a creative on each pre-bid line item. When a programmatic line item is picked by your ad server, the “creative” JS snippet tells prebid.js which bidder to serve. The short code snippet documented here handles all bidders and all sizes.



</div>
