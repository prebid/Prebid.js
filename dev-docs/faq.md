---
layout: page
title: FAQ
description: FAQ on Prebid.js for header bidding.
pid: 40
top_nav_section: dev_docs
nav_section: reference
---

<div class="bs-docs-section" markdown="1">

# FAQ
{:.no_toc}

This page has answers to some frequently asked questions.  If you don't find what you're looking for here, see the [issues with the 'question' tag on the Prebid.js repo](https://github.com/prebid/Prebid.js/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3Aquestion%20).

* TOC
{:toc}

## When starting out, what should my timeouts be?

1,000 milliseconds or less is considered best practice as a starting point for header-bidding container solutions.

## How many header bidders should I have?

Every publisher is different.  In order to answer this question you'll need to run some tests, gather data, and decide what works for you based on your performance and monetization needs.

Generally speaking, in a client-side header bidding implementation, you should aim to bring in approximately 1-5 demand partners. In a server-to-server implementation, you have some flexibility to add more partners. 

In both scenarios, your goal should be to see your inventory fill at the highest CPMs without adding too much latency in the process. When selecting your demand partners, it’s important to choose marketplaces that have premium demand at scale, high ad quality and low latency.

There is an analysis from the Prebid team here which may be useful:

[How many bidders should I work with?]({{site.github.url}}/blog/how-many-bidders-for-header-bidding)

## Some of my Demand Partners send Gross Bids while others send Net Bids; how can I account for this difference?

You will want to adjust the gross bids so that they compete fairly with the rest of your demand, so that you are seeing the most revenue possible. 

In Prebid.js, you can use a `bidCpmAdjustment` function in [the `bidderSettings` object]({{site.github.url}}/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings) to adjust any bidder that sends gross bids.

## Does Prebid.js support synchronous ad server tags?

Short answer: not out of the box, because of header bidding partners' limitations. But there are workarounds.

Take GPT synchronous mode as an example - if you’re loading GPT synchronously, there is no simple way of delaying GPT library loading to wait for bidders’ bids (`setTimeout()` cannot be used).

Therefore, it requires Prebid.js to run in a blocking/synchronous fashion. **This will require all header bidding partners’ code to be blocking/synchronous**.  We're not even sure if this is possible. We do not have a great out-of-the box solution for turning Prebid.js blocking at the moment.

Here are a couple of alternative workarounds:

- **Option 1:**

	Load a blocking script that has a load time of 300-500ms. This script does nothing but keep the page waiting.  In the meantime Prebid.js can run asynchronously and return the bids. After the blocking script finishes loading, GPT can start synchronously; at this point there will be header bidding bids available.

	For the best user experience, you probably want to insert this blocking script after the above the fold page content has loaded. Or if you're okay with additional 500ms latency added to your page load time, this can be easily done.

- **Option 2:**

	Use post-bid. The downsides are that post-bid no longer allows your header bidding partners to compete with DFP/AdX, but they can still compete with each other.  For more information, see [What is post-bid?](http://prebid.org/overview/what-is-post-bid.html).

## How do I use Prebid.js on secure (HTTPS) pages?

All prebid adapters that get merged should automatically detect if they're serving into a secure page environment and respond appropriately.

In other words, you shouldn't have to do anything other than make sure your own page loads Prebid.js securely, e.g.,

```html
<script src='https://acdn.adnxs.com/prebid/not-for-prod/prebid.js' async=true />
```

(Except that you should *never never never* use the copy of Prebid.js at that URL in production, it isn't meant for production use and may break everything at any time.)

## Related Reading

+ [Prebid Dev Tips]({{site.github.com}}/dev-docs/troubleshooting-tips.html)
+ [Prebid Common Issues]({{site.github.com}}/dev-docs/common-issues.html)
+ [Prebid.js issues tagged 'question'](https://github.com/prebid/Prebid.js/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3Aquestion%20)

</div>
