---
layout: page
title: How it Works
head_title: How it Works
description: An overview of how header bidding with prebid.js works
pid: 1
hide: true
isNavParent: true
isNavDropdown: false

---

<div class="bs-docs-section" markdown="1">

# Overview

At a high level, header bidding involves just a few steps:

1. The Prebid.js library fetches bids from various partners

2. Prebid.js passes information about those bids (including price) to
   the tag on page, which passes it to the ad server as query string
   parameters.

3. The ad server has line items targeting those parameters.

Note that the only additional latency introduced by header bidding
comes during step #1.  Fortunately this latency can be controlled by
[a timeout setting]({{site.github.url}}/publisher-api.html#ad-server-timeout).
Furthermore, Prebid.js sends bid requests asynchronously to avoid
blocking page load.

For more information about how to set up header bidding with
Prebid.js, see
[Getting Started]({{site.github.url}}/getting-started.html).

</div>

<div class="bs-docs-section" markdown="1">

# Step by Step

The steps below describe how the process of header bidding with
Prebid.js works in more detail (Each numbered step is shown in the
diagram at the bottom of this page):

1. Prebid.js loads asynchronously in the page header and hooks into
   the ad tag on page to get the placement ID and size.  It can also
   be used to set a timeout to delay loading the ad tag while the
   header auction occurs. If the header auction exceeds the timeout,
   the auction is skipped and the tag on page loads normally.

2. Prebid.js makes an auction request to each of the header bidding
   partners that you've configured.

3. Each partner holds its own internal auction.

4. Each partner returns bids to Prebid.js which include the creative
   payload and other information.

5. Prebid.js passes along bid information (including price) to the tag
   on page, which passes it to the ad server as a set of query string
   parameters. In the ad server, there are line items targeting those
   parameter.

6. The ad server evaluates all of the bids and chooses a winner.  The
   tag on the page loads a creative from the winning bidder.  Note
   that no additional latency is introduced by creatives from header
   bidding partners since their creative payloads were already fetched
   during step #4.

</div>

![Prebid Auction Diagram]({{ site.github.url }}/assets/images/prebid-auction.png)
