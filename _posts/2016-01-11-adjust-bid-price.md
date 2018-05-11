---
layout: post
title: Adjust Bid Price for Gross/Net Now Supported

description: Adjust Bid Price for Gross/Net Is Now Supported for Prebid.js

permalink: /blog/adjust-bid-price

---

### Background

Bidders may have different pricing deals with publishers, and the returned bid prices may or may not reflect what the publisher will truly receive in the end. 

For example, some bidders returned the bid prices in gross (before any fee is taken). This artificially sets that bidder's bid (say $1.2) at an unfair advantage, because the bidding price, when bid wins, is in fact not what the publisher will receive. The publisher in fact got paid $1. However, if there was a competing price $1.1 in net (after the fee is taken), the publisher would have earned more if taking that $1.1 bid.

<br>

### What is the feature

This feature allows the publisher to adjust the bidding price before the bids targeting are set on the ad server tag. This is especially relevant for publishers who choose to let prebid.js send only the top winning bid to the ad server, because the price adjustment is done before the top winning bid is chosen. 

{: .pb-img.pb-md-img :}
![Prebid.js Adjust Bid Price]({{ site.github.url }}/assets/images/blog/prebid-adjust-price.png)

<br>

### How to use the feature

See the [Publisher API Reference](/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings) for more details.

