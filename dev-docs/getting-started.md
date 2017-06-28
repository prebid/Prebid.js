---
layout: page
title: Getting Started
description: Dev Docs for Getting Started with Prebid.js for Header Bidding
pid: 0
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: quick-start
---

<div class="bs-docs-section" markdown="1">

# Getting Started

* TOC
{:toc }

### Quick Start

The easiest way to get started with Prebid.js is to use the following JSFiddle example. Go to the "Result" tab to see the keyword targeting for this header auction.

{% include dev-docs/build-from-source-warning.md %}

For more information on how to setup your ad server, see the [Ad Ops Guide](/adops.html).

<iframe width="100%" height="680" src="//jsfiddle.net/prebid/hqhbLdxn/61/embedded/html,result" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

<div class="bs-docs-section" markdown="1">

<br>

<a name="basic-example">

### More Details

+ <a href="#register-bidder-tag-ids">Register bidder tag IDs</a>
+ <a href="#set-ad-server-timeout">Set the ad server timeout</a>
+ <a href="#set-bid-targeting">Set bid targeting</a>

<a name="register-bidder-tag-ids"></a>

#### 1. Register bidder tag IDs

In a simple JSON config, define a mapping of the bidders’ tag Ids to your ad units. Load prebid.js library async. Call `pbjs.requestBids()` to send header bidding requests async to all bidders you've specified.

{% highlight html %}
<script src="prebid.js" async></script>
{% endhighlight %}

{% highlight js %}
{% include getting-started/register-bidder-tag-ids.js %}
{% endhighlight %}

<a name="set-ad-server-timeout"></a>

#### 2. Set the ad server timeout

Define the timeout to let your ad server wait for a few hundred milliseconds, so the bidders can respond with bids.

{% highlight js %}

PREBID_TIMEOUT = 300;
function sendAdserverRequest() {
    (function() {
        // Send ad server ad request here
    })();
};
setTimeout(initAdserver, PREBID_TIMEOUT);

{% endhighlight %}

<a name="set-bid-targeting"></a>

#### 3. Set bid targeting

Call the helper function `setTargetingForGPTAsync()` to handle all the targeting for all bidders.

{% highlight js %}

pbjs.que.push(function() {
  pbjs.setTargetingForGPTAsync();
});

{% endhighlight %}

<br>

### Next Step (Full Example):

> View or download a [full example](/dev-docs/examples/basic-example.html) with line by line code walkthrough!
