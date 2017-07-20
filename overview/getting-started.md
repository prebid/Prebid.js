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

The steps required to set up Prebid.js look like this:

1. **Add Prebid code to the page**
  + Your developer has added Prebid to the page so it can be loaded on the next impression.
  + You've configured Prebid.js and set up one or more supported demand adapters (SSP, exchanges, ad networks, etc.)
2. **Call bidders asynchronously**
  + As the page loads, Prebid.js will asynchronously call all bidders to request how much they're willing to pay for the impression. The asynchronous calls mean the page's content continues to render without interruption.
3. **Set a timer on the page**
  + To prevent bidders from taking too long, Prebid.js enables you to set a timer to control how long the ad server should wait for the bidders. If the auction exceeds the timeout, the auction is skipped and the impression is sent to the ad server.
4. **Make ad server requests with key-value targeting**
  + When bids are received, Prebid.js adds the price and creative ID to your ad server's call as a set of query string parameters.
5. **Target the line items**
  + Within your ad server, line items are set up to target various bid prices, allowing the bidders' programmatic demand to compete with other line items or integrated exchanges (like Google Ad Exchange) based on price.
6. **Render the creative**
  + A small snippet of JavaScript is set up as a creative on each Prebid line item. When a programmatic line item is picked by your ad server, the creative JS tells Prebid.js which bidder to serve.

## Further Reading

Now that you understand the basics, check out the implementation docs:

+ [Ad Ops]({{site.github.url}}/adops.html)
+ [Developers]({{site.github.url}}/dev-docs/getting-started.html)

</div>
