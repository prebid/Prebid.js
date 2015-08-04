---
layout: default
title: Getting Started
description: An overview of Prebid.js, how it works, basic templates and examples, and more.
pid: 0
isHome: false
---

<!--

I would move the Basic Example immediately below the “What is Prebid.js” section.
I would break up Basic Example section into three sub-sections, one for each step. Under the code for each section, we should add quick explanatory text describing what’s going on.
-->


<div class="bs-docs-section" markdown="1">

#Overview

###What is Prebid.js?

> Prebid.js is an open source Javascript framework to help publishers integrate and manage pre-bid partners without writing custom code or increasing page load times. Prebid.js is 100% open source and free for anyone to use. [Learn more about pre-bid here.]()


* It has clean, built-in support for all major bidders (Amazon, AppNexus, Rubicon, etc), as well as major ad servers (DFP, OAS, AdTech). 
* Prebid.js has solved many known problems publishers are facing - high latency, unfair auction mechanics, long development time, confusing line item and targeting setup.
* Plugging in prebid.js is easy. Adding new pre-bid bidders is a matter of adding tag Ids into a JSON config.

<br>

<a name="basic-example">

###Basic Example
Here’s a basic example for Rubicon and AppNexus bidding into a DFP ad unit:

#####1. Register bidder tag Ids

In a simple JSON config, define a mapping of the bidders’ tag Ids to your ad units. Then load prebid.js library async. Note that immediately after the library is loaded, prebid.js will send pre-bid requests async to all bidders you've specified.

{% highlight js %}

pbjs.adUnits = [{
    code: "/1996833/slot-1",
    sizes: [[300, 250], [728, 90]],
    bids: [{
        bidder: "rubicon",
        params: {
            account: "4934",
            site: "13945",
            rp_zonesize: "23948-15"
        }
    }, {
        bidder: "appnexus",
        params: { tagId: "234235" }
    }]
}];

// Load prebid.js library async

{% endhighlight %}


#####2. Ad server waits for bids

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



#####3. Set targeting for bids

Call the helper function once `setTargetingForGPTAsync()` to handle all the targeting for all bidders. 

{% highlight js %}

if (pbjs.libLoaded) pbjs.setTargetingForGPTAsync();

{% endhighlight %}

For detailed walkthrough and API references, check out the [Publisher API docs](publisher-api.html).

<br>

<a name="how-works">

###How does it work?
> Prebid.js sends bid requests to partners asynchronously and manages timeouts to keep page load times fast.

![Prebid Diagram Image]({{ site.github.url }}/assets/images/prebid-diagram.png)

<br> 


###Prebid.js is designed modularly
> Prebid.js exposes three API’s - a Publisher API used to request ads, a Bidder API used for Bidders to respond to ad requests, and an Ad Server API used to integrate with ad servers.

* **Publisher API**

	If you're a publisher, this is the main API you'll be using. You have already seen the skeleton in the above [How does it work](#how-works) and [Basic Example](#basic-example). You'll use the API to define the bidders' tag IDs, let your ad server wait for a certain amount of time and let bidders respond with bids, then set targeting on your ad units before sending the impressions to the ad server.

* **Bidder API**

	Prebid.js supports all major pre-bid bidders out of the box. We used the same API to implement all the bidder integrations. If you'd like to add a new bidder into the framework, or just to study how it works, refer to [Bidder API Docs](adaptors.html).

* **Ad Server API**: 

	Prebid.js comes with support for most major ad servers. If you'd like to implement a custom ad server, or to add a new ad server into the list, refer to [Ad Server API Docs](adaptors.html).

</div>



<div class="bs-docs-section" markdown="1">


#Download

<p class="lead">
Prebid.js is under rapid development. Get the latest version and stay in touch:
</p>

<div class="form-horizontal">
  
  <div class="form-group">
    <label class="col-sm-2 col-xs-6 control-label">Email</label>
    <div class="col-sm-4 col-xs-8">
      <input class="form-control" placeholder="Email" id="email-field" required>
    </div>
    <div class="col-sm-4 col-xs-4">
      <button class="btn btn-outline" id="submit-email" onclick="submitEmail()">Get Latest</button>
    </div>
  </div>
</div>

<div class="row bs-downloads">
    <div class="col-sm-12">
      <h3 id="download-bootstrap">Compiled and Minified</h3>
      <p>Compiled and minified JavaScript with example files. No docs or original source files are included.</p>
      <p>
        <a href="{{site.downloadUrl}}" class="btn btn-lg btn-default" onclick="ga('send', 'event', 'Getting started', 'Download', 'Download compiled');">Download Prebid.js</a>
      </p>
    </div>

  </div>

</div>

