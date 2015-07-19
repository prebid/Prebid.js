---
layout: default
title: Getting Started
description: An overview of Prebid.js, how it works, basic templates and examples, and more.
isHome: false
---

<div class="bs-docs-section" markdown="1">

#Overview

###What is Prebid.js

> Prebid.js is an open-source Javascript framework that’s optimized for your pre-bid integrations. 

* It has clean, built-in support for all major bidders (Amazon, AppNexus, Criteo, Pubmatic, etc), as well as major ad servers (DFP, AdTech). 
* Prebid.js has solved many known problems publishers are facing - high latency, unfair auction mechanics, long development time. 
* Plugging in prebid.js is easy. Adding new pre-bid bidders is a matter of editing JSON config.

<br>

<a name="how-works">

###How does it work?
> Prebid.js helps you send out pre-bid requests asynchronously, while watching out the timeout for ya.

![Prebid Diagram Image]({{ site.github.url }}/assets/images/prebid-diagram.png)

1. **Register bidder tag Ids:** 

	Define a mapping of the bidders’ tag Ids to your ad units.

2. **Ad server wait for bids:** 

	Define the timeout so your ad server would wait for a few hundred milliseconds and the bidders can respond with bids.

3. **Set targeting for bids:** 

	Set bids’ CPM for your ad units’ targeting, then send the impressions to your ad server.

<br> 

<a name="basic-example">

###Basic Example
Here’s a basic example for Amazon and AppNexus bidding into a DFP ad unit:

{% highlight js %}
var pbjs = pbjs || {};

// 1. Register bidder tag Ids
pbjs.adUnits = [{
    code: "/1996833/slot-1",
    sizes: [[300, 250], [728, 90]],
    bids: [{
    	bidder: "amazon",
    	bidId: { siteId: "8765" }
    }, {
        bidder: "appnexus",
        bidId: { tagId: "234235" }
    }]
}];

// 2. Ad server wait for bids
PREBID_TIMEOUT = 300;
function initAdserver() {
    (function() {
        // To load GPT Library Async
    })();
    pbjs.initAdserverSet = true;
};
setTimeout(initAdserver, PREBID_TIMEOUT);

// 3. Set targeting for bids
googletag.cmd.push(function() {
    var slot = googletag.defineSlot('/1996833/slot-1', [[300, 250], [728, 90]]);
    if (pbjs.libLoaded) {
        pbjs.setTargetingForGPTAsync(slot, '/1996833/slot-1');
    }
});

{% endhighlight %}

<br>

###Keep things modular
> Heard of MVP? Here we go: PBA - publisher API, bidder API, and ad server API.

* **Publisher API**

	If you're a publisher, this is the main API you'll be using. You have already seen the skeleton in the above [How does it work](#how-works) and [Basic Example](#basic-example). You'll use the API to define the bidders' tag IDs, let your ad server wait for a certain amount of time and let bidders respond with bids, then set targeting on your ad units before sending the impressions to the ad server.

* **Bidder API**

	Prebid.js supports all major pre-bid bidders out of the box. We used the same API to implement all the bidder integration. If you'd like to add a new bidder into the framework, or just to study how it works, refer to [Bidder API Docs]().

* **Ad Server API**: 

	Prebid.js comes with support for most major ad servers. If you'd like to implement a custom ad server, or to add a new ad server into the list, refer to [Ad Server API Docs]().

</div>





