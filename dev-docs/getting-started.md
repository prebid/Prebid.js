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

## Quick Start

The easiest way to get started with Prebid.js is using the following JSFiddle example. Go to the "Result" tab to see the keyword targeting for this header auction.

* **[Prebid.js JSFiddle](http://jsfiddle.net/hqhbLdxn/1/)**

<iframe width="100%" height="680" src="//jsfiddle.net/prebid/hqhbLdxn/8/embedded/html,result" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

<br>

{: .bg-info :}
Note that the above JSFiddle code is not integrated with an ad server. To move to the next section, you will **need access to your ad server** for setting up line items. For more information on how to setup your ad server, go to [Adops Guide](/adops.html).

<div class="bs-docs-section" markdown="1">

<a name="basic-example">

## Example: Rubicon and AppNexus bidding on a DFP ad unit

Here is a basic example for Rubicon and AppNexus bidding into a DFP ad unit.

+ <a href="#register-bidder-tag-ids">Register bidder tag IDs</a>
+ <a href="#set-ad-server-timeout">Set the ad server timeout</a>
+ <a href="#set-bid-targeting">Set bid targeting</a>

<a name="register-bidder-tag-ids"></a>

### Register bidder tag IDs

In a simple JSON config, define a mapping of the bidders’ tag Ids to your ad units. Then load prebid.js library async. Call `pbjs.requestBids()` to send header bidding requests async to all bidders you've specified.

{% highlight html %}
<script src="prebid.js" async></script>
{% endhighlight %}

{% highlight js %}
{% include getting-started/register-bidder-tag-ids.js %}
{% endhighlight %}

<a name="set-ad-server-timeout"></a>

### Set the ad server timeout

Define the timeout to let your ad server wait for a few hundred milliseconds, so the bidders can respond with bids.

{% highlight js %}

PREBID_TIMEOUT = 300;
function initAdserver() {
    (function() {
        // To load GPT Library Async
    })();
    pbjs.initAdserverSet = true;
};
setTimeout(initAdserver, PREBID_TIMEOUT);

{% endhighlight %}

<a name="set-bid-targeting"></a>

### Set bid targeting

Call the helper function `setTargetingForGPTAsync()` to handle all the targeting for all bidders. 

{% highlight js %}

pbjs.que.push(function() {
  pbjs.setTargetingForGPTAsync();
});

{% endhighlight %}

For detailed walkthrough and API references, check out the [Code Examples](/dev-docs/examples/basic-example.html).
