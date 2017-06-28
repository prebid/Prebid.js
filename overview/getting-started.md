---
redirect_from: "/getting-started.html"
layout: page
title: Getting Started
head_title: Getting Started with Prebid for Header Bidding
description: An overview of Prebid, how it works, basic templates and examples, and more.
pid: 10
top_nav_section: overview
nav_section: intro
---

<div class="bs-docs-section" markdown="1">

# Getting Started

The steps of a Prebid.js setup look like this:

1. Prebid code added to page
  + Your developer has added Prebid to the website so it can be loaded on the next impression.
  + You've configured Prebid.js and set up one or more supported demand adapters (SSP, exchanges, ad networks, etc.)
2. Call bidders asynchronously
  + As the page loads, Prebid.js will asynchronously call all bidders to request how much they're willing to pay for the impression. 
  + *Note*: The asynchronous calls mean the page's content continues to render without interruption.
3. Timer on page
  + To prevent header bidding partners from taking too long, Prebid.js enables you to set a timer to control how long the ad server should wait for the header bidding partners. If the header auction exceeds the timeout, the auction is skipped and the impression is sent to the ad server.
4. Ad server requests with key-value targeting
  + When bids are received, Prebid.js adds the price and creative identifier to your ad server's call as a set of query string parameters.
5. Line items
  + Within your ad server, line items are set up to target the various bid prices, allowing the bidders' programmatic demand to compete with other line items or integrated exchanges (like Google Ad Exchange) based on price.
6. Creative
  + A small snippet of JavaScript is set up as a creative on each prebid line item. When a programmatic line item is picked by your ad server, the "creative" JS snippet tells Prebid.js which bidder to serve. The short code snippet handles all bidders and all sizes.

Now that you understand the basics, check out the implementation docs:

+ [Ad Ops]({{site.github.url}}/adops.html)
+ [Developers]({{site.github.url}}/dev-docs/getting-started.html)

</div>
