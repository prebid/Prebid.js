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

## How many header bidders should I have?

Every publisher is different.  In order to answer this question you'll need to run some tests, gather data, and decide what works for you based on your performance and monetization needs.

There is an analysis from the Prebid team here which may be useful:

[How many bidders should I work with?]({{site.github.url}}/blog/how-many-bidders-for-header-bidding)

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

</div>
