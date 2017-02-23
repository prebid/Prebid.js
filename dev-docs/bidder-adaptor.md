---
layout: page
title: How to Add a New Bidder Adaptor
description: Documentation on how to add a new bidder adaptor
pid: 25
top_nav_section: dev_docs
nav_section: adaptors
---

<div class="bs-docs-section" markdown="1">

# How to Add a New Bidder Adaptor
{:.no_toc}

At a high level, a bidder adapter is responsible for:

1. Sending out bid requests to the ad server
2. Registering the bids that are returned with Prebid.js

This page has instructions for writing your own bidder adapter.  The instructions here try to walk you through some of the code you'll need to write for your adapter.  When in doubt, use [the working adapters in the Github repo](https://github.com/prebid/Prebid.js/tree/master/src/adapters) for reference.

{: .alert.alert-success :}
**Adding a Video Bidder Adaptor?**  
See [How to Add a New Video Bidder Adaptor]({{site.github.url}}/dev-docs/how-to-add-a-new-video-bidder-adaptor.html).

* TOC
{:toc}


## Step 1: Prepare prerequisites for a pull request

In your PR to add the new adapter, please provide the following information:

- The contact email of the adapter's maintainer.
- A test ad unit that will consistently return test creatives. This helps us to ensure future Prebid.js updates do not break your adapter.
- Any other information listed as required in [CONTRIBUTING.md](https://github.com/prebid/Prebid.js/blob/master/CONTRIBUTING.md).

## Step 2: Add a new bidder JS file

1. Create a JS file under `src/adapters` with the name of the bidder, e.g., `rubicon.js`

2. Create an adapter factory function with the signature shown below:

{% highlight js %}
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var BidderNameAdapter = function BidderNameAdapter() {

    function _callBids(params){}

    // Export the `callBids` function, so that Prebid.js can execute
    // this function when the page asks to send out bid requests.
    return {
        callBids: _callBids
    };
};

module.exports = BidderNameAdapter;
{% endhighlight %}

A good example of an adapter that uses this pattern for its implementation is [OpenX](https://github.com/prebid/Prebid.js/blob/master/src/adapters/openx.js).

## Step 3: Design your bid params

Use the `bid.params` object for defining the parameters of your ad request.  You can include tag ID, site ID, ad size, keywords, and other data, such as [video bidding information]({{site.github.url}}/dev-docs/how-to-add-a-new-video-bidder-adaptor.html).

For more information about the kinds of information that can be passed using these parameters, see [the list of bidder parameters]({{site.github.url}}/dev-docs/bidders.html).

For more information about how the implementation of `callBids` should work generally, see the next section.


## Step 4: Send out bid requests

When the page asks Prebid.js to send out bid requests, your bidder's `_callBids(params)` function will be executed. This is a good place for you to send out bid requests to your bidder.

Example:

{% highlight js %}

function _callBids(params) {
    bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
        var bid = bids[i];
        // Send out bid request for each bid given its tag IDs and query strings
    }
    // Or, send out 1 bid request for all bids, depending on your bidder.
}

{% endhighlight %}

The `params` object contains information about the bids configured in the request:

{% highlight js %}
{
    bidderCode: "openx",
    bids: [
        {
            bidder: "openx",
            adUnitCode: "id123/header-bid-tag-0",
            sizes: [ [300, 250], [300, 600] ]
            // params is custom to the bidder adapter and will be
            // passed through from the configuration as is.
            params: { 
            	unit: '3242432',
                pgid: '123124',
                jstag_url: 'http://...'
            },
        }, {
        	bidder: "openx",
        	// params, adUnit Code, and sizes
        	// Note that the same adUnitCode may appear again.
    	}
    ]
}
{% endhighlight %}

Note that you should keep track of the `adUnitCode` in bid requests. In the next section this will come in handy.


## Step 5: Register bid responses

When the bid response(s) are available, notify Prebid.js immediately, so that your bid can get into the auction as soon as possible. A bidder's API will usually have an event listener that notifies you when the bid responses are back.

To register the bid, call the `bidmanager.addBidResponse(adUnitCode, bidObject)` function. To register multiple bids, call the function multiple times.

If the bid is valid, create the bid response as shown below, matching the bid request/response pair.  A status of `1` means the bid response is valid.  For details about the status codes, see [constants.json](https://github.com/prebid/Prebid.js/blob/master/src/constants.json).

{% highlight js %}
var utils       = require('../utils.js');
var bidfactory  = require('../bidfactory.js');

var bidRequest  = utils.getBidRequest(id);
var bidResponse = bidfactory.createBid(1, bidRequest);
{% endhighlight %}

If the bid is invalid (no fill or error), create the `bidObject` as shown below.  A status of `2` means "no bid".

{% highlight js %}
var bidRequest  = utils.getBidRequest(id);
var bidResponse = bidfactory.createBid(2, bidRequest);
{% endhighlight %}

Example:

{% highlight js %}

// In the bidder's API callback...

// the bidder API's ad response unit that has info like CPM, creative content
var adUnit;

var bidRequest  = utils.getBidRequest(id);
var bidObject = bidfactory.createBid(1, bidRequest);
bidObject.bidderCode = 'openx';
bidObject.cpm = Number(adUnit.get('pub_rev')) / 1000;
bidObject.ad = adUnit.get('html');
bidObject.width = adUnit.get('width');
bidObject.height = adUnit.get('height');

// send the bidResponse object to bid manager with the adUnitCode.
bidmanager.addBidResponse(adUnitCode, bidObject);

// invalid bid response
bidObject = bidfactory.createBid(2, bidRequest);
bidObject.bidderCode = 'openx';
bidmanager.addBidResponse(adUnitCode, bidObject);

{% endhighlight %}

**`adUnitCode` in `addBidResponse`**

In bidder API's callback, there'll be ID(s) that tie back to the request params in the `bid` object. Building a map from `adUnitCode` to the request param(s)/ID(s) will help you retrieve the `adUnitCode` based on the callback.

**`bidObject` in `addBidResponse`**

The required parameters to add into `bidObject` are:

{: .table .table-bordered .table-striped }
| Key          | Scope     | Description                                                              | Example                              |
| :----        | :-------- | :-------                                                                 | :-------                             |
| `bidderCode` | Required  | The bidder code.                                                         | `"pubmatic"`                         |
| `cpm`        | Required  | The bid price. We recommend the most granular price a bidder can provide | 3.5764                               |
| `width`      | Required  | The width of the returned creative.                                      | 300                                  |
| `height`     | Required  | The height of the returned creative.                                     | 250                                  |
| `ad`         | Required  | The creative payload of the returned bid                                 | `"<html><h3>I am an ad</h3></html>"` |


## Helper functions

**`adloader.loadScript(scriptURL, callback, cacheRequest)`**

Load a script asynchronously. The callback function will be executed when the script finishes loading.

Use this with the `cacheRequest` argument set to `true` if the script you're loading is a library or something else that doesn't change between requests.  It will cache the script so you don't have to wait for it to load before firing the supplied callback.

For usage examples, see [the working adapters in the repo](https://github.com/prebid/Prebid.js/tree/master/src/adapters).

## Further Reading

+ [How to Add a New Video Bidder Adaptor]({{site.github.url}}/dev-docs/how-to-add-a-new-video-bidder-adaptor.html)

+ [The bidder adapter sources in the repo](https://github.com/prebid/Prebid.js/tree/master/src/adapters)

</div>
