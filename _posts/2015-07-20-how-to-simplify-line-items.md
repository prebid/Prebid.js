---
layout: post
title: How to simplify line item setup
head_title: How to simplify line item setup for header bidding with prebid.js

description: A walkthrough of why header bidding implementations cause latency. An overview of how to use prebid.js to reduce it.

permalink: /blog/how-to-simplify-line-item-setup

---

#### Let's do the math:

* Per bidder per size: $0.01 increment, capped at $10 => 1000 line items
* 10 creative sizes
* 5 bidders

1000 x 10 x 5 = 50,000 line items and creatives for header bidding!

<br>

#### How to reduce the number of line items for header bidding?

> Prebid.js helps you use 1 set of line items for all bidders and all creatives.

By removing the size and bidder dimension, the number of line items now becomes:

1000 x 1 x 1 = 1000 line items! 50 times less!

<br>

### Simplification 1: Remove the size dimension

In this section, we'll learn how to remove the creative size dimension for header bidding. Before, a publisher would have to create different set of line items for different creative sizes. With Prebid.js, a publisher only need to create 1 set of line items for all creative sizes.

Let's first clarify what "different set of line items for different creative sizes" means. In this scenario, a line item's creative is only of one size. In DFP, this looks like:

{: .pb-md-img :}
![Header Bidding Normal Line Item Creative]({{ site.github.url }}/assets/images/blog/line-item-creative.png)


Because a site would have many creative sizes, with this setup you need X number of line item sets for X number of creative sizes.

There's a reason bidders recommend different set of line items for different creative sizes. If we simply attach all creative sizes to a line item, the line item wouldn't know which size of creative to choose. Consider this case:

* Your line item has all creatives of different sizes attached. 
* Your ad unit can accept both 300x250 and 300x600. A bidder bid $6.00 for the 300x600 size and has the highest price.
* The $6.00 line item got picked by the line item. 
* The best your ad server can do is to RANDOMLY choose a creative. If the 300x250 one is chosen, the ad will be cut in half.

#### How Prebid.js solves this problem:

Prebid.js can dynamically resize the returned creative to the right size. Here's the setup:

* Submit a few creatives of size 1x1 and make them override the line items' sizes.
* Your ad unit can accept both 300x250 and 300x600. A bidder bid $6.00 for the 300x600 size and has the highest price. Prebid.js passed the bid in, as well as a generated bid ID. 
* The $6.00 line item got picked by the line item. 
* Your ad server randomly choose a 1x1 creative. However, because all creatives have the same content, it does not make a difference.
* The creative content has the bid ID. Prebid.js reads this bid ID, which is mapped to size 300x600. 
* Prebid.js resize the returned creative to size 300x600 and injects the bid's cretive payload.

There you go!


### Simplification 2: Remove the bidder dimension

In this section, we'll learn how to remove the bidder dimension for header bidding. Before, a publisher would have to create different set of line items for different bidders. For example, 3 different set of line items for AppNexus, Pubmatic, and Rubicon. With Prebid.js, a publisher only need to create 1 set of line items for all bidders.

There're a few reasons why previously you'd need different set of line items for bidders.

1. Bidders did not design their implementation guide with other bidders in mind.
2. Bidders all have different targeting parameters.
3. You need to run reports to learn fill rates and CPM from different bidders. 

Assume we have 1 set of line items for ALL bidders. Consider the below key-value pairs came in: (AppNexus bid $1.60, Rubicon bid $1.20. Ad IDs are used for rendering the right creative):

* `appnexus_cpm`: 1.60
* `appnexus_adId`: 65432
* `rubicon_cpm`: 1.20
* `rubicon_adId`: 23456

The line item for $1.60 is chosen because it has the highest price. However, the creative attached to this line item will be given both `appnexus_ad_id`: 65432 and `rubicon_ad_id`: 23456. There's not an easy way for the right creative (in this case the AppNexus creative) to render.

<a name="pbjs-sends-highest-price-only"></a>

#### How Prebid.js solves the problem:

Prebid.js only picks the highest price bid and sends its key-value pairs to the ad server. Given the above example, Prebid.js will send:

* `hb_pb`: 1.60
* `hb_adId`: 65432
* `hb_bidder`: appnexus

This simplifies the setup and the right creative (with adId 65432) will get displayed. 

#### How about reporting?

It's important to understand the fill rates and CPM from different bidders. Prebid.js therefore passes in `hb_bidder`: bidderCode. This enables DFP to report on query strings. You can therefore run queries like:

* For bidder X, at what CPM does it fill?
* For bidder X, what's the fill rate out of all the winning header bidding bids?

Note that because Prebid.js only sends in the highest price bid, DFP does not see the rest of the lost bids. However, from working with publishers, we conclude that the rest of the bids do NOT matter that much. Let's say one bidder always fills at 1 penny and bids 100% of the time. Is that information helpful? Not really, only the winning bids count. We belive the above 2 queries well serve the reporting and analytics needs. 

### Conclusion

Enjoy the much more simplified line items, creatives, and targeting setup!






