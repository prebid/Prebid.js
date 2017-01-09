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

## Does Prebid.js support synchronous ad server tags?

Short answer is not out of the box, because of header bidding partners' limitations. But there're workarounds.

Take GPT synchronous mode as an example - if you’re loading GPT synchronously, there is no simple way of delaying GPT library loading (setTimeout() cannot be used) to wait for bidders’ bids.

It therefore requires Prebid.js to run in a blocking/synchronous fashion. **This will require all header bidding partners’ code to be blocking/synchronous**, which we’re not sure if it’s even possible. We therefore do not have a great out of the box solution for turning prebid.js blocking at the moment.

A couple alternative workarounds:

- **Option 1:**

	Load a blocking script that has a load time of 300-500ms. This script does nothing but keeps the page waiting, while in the mean time Prebid.js can run asynchronously and return the bids. After the blocking script finishes loading, GPT can start synchronously and at this point there will be header bidding bids available.

	For the best user experience, you probably want to insert this blocking script after the above the fold page content has loaded. Or if you're okay with additional 500ms latency added to your page load time, this can be easily done.

- **Option 2:**

	Use post bid. The downsides are post-bid no longer allows your header bidding partners to compete with DFP/AdX, but they can compete with each other. Documentation here: http://prebid.org/overview/what-is-post-bid.html

## How many header bidders should I have?

Every publisher is different.  In order to answer this question you'll need to run some tests, gather data, and decide what works for you based on your performance and monetization needs.

There is an analysis from the Prebid team here which may be useful:

[How many bidders should I work with?]({{site.github.url}}/blog/how-many-bidders-for-header-bidding)

</div>
