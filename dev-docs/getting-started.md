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

# JSFiddle

The easiest way to get started with Prebid.js is using the following JSFiddle example. Go to the "Result" tab to see the keyword targeting for this header auction.

* **[Prebid.js JSFiddle](http://jsfiddle.net/hqhbLdxn/1/)**

<iframe width="100%" height="680" src="//jsfiddle.net/prebid/hqhbLdxn/8/embedded/html,result" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

<br>

{: .bg-info :}
Note that the above JSFiddle code is not integrated with an ad server. To move to the next section, you will **need access to your ad server** for setting up line items. For more information on how to setup your ad server, go to [Adops Guide](/adops.html).

<!--
<div class="bs-docs-section" markdown="1">

# Explore Live Demo

#### The below ad is auctioned by Prebid.js with DFP as the example ad server:

{% include live_demo.html %}

{: .bg-info :}
Open it in a new tab, **download the HTML source**, and play around with it! We will explain how it works in the next section.

</div>

-->

<div class="bs-docs-section" markdown="1">

# Quick Start

<a name="basic-example">

### Basic Example
Here is a basic example for Rubicon and AppNexus bidding into a DFP ad unit:

**1. Register bidder tag Ids**

In a simple JSON config, define a mapping of the bidders’ tag Ids to your ad units. Then load prebid.js library async. Call `pbjs.requestBids()` to send header bidding requests async to all bidders you've specified.

{% highlight js %}

<script src="prebid.js" async></script>

pbjs.que.push(function() {
  var adUnits = [{
    code: "div-gpt-ad-1438287399331-0",
    sizes: [[300, 250], [728, 90]],
    bids: [{
        bidder: "rubicon",
        params: {
            rp_account: "4934",
            rp_site: "13945",
            rp_zonesize: "23948-15"
        }
    }, {
        bidder: 'sovrn',
        params: { tagId: '315045' }
    }, {
        bidder: "appnexus",
        params: { placementId: "234235" }
    }]
  }];
  pbjs.addAdUnits(adUnits);

  pbjs.requestBids({
    bidsBackHandler: function() {
        // callback when requested bids are all back
    };
  });

});

{% endhighlight %}


**2. Ad server waits for bids**

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



**3. Set targeting for bids**

Call the helper function `setTargetingForGPTAsync()` to handle all the targeting for all bidders. 

{% highlight js %}

pbjs.que.push(function() {
  pbjs.setTargetingForGPTAsync();
});

{% endhighlight %}

For detailed walkthrough and API references, check out the [Code Examples](/dev-docs/examples/basic-example.html).

<br>

