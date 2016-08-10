---
layout: page
title: New Bidder Adaptor
description: Documentation on how to add a new bidder adaptor
pid: 25

top_nav_section: dev_docs
nav_section: adaptors
---

<div class="bs-docs-section" markdown="1">

# How to add a new bidder adaptor
{:.no_toc}

A bidder adapter is responsible for:

1. Given the list of all ad unit tag IDs, sending out the bid requests in the most efficient way.
2. Whenever a bid is back, registering the bid with Prebid.js. 

* TOC
{:toc}


### Step 1: Prepare for a Github PR

In your PR, please provide the following contact information:

- The contact email of the adapter maintainer.
- A test ad unit that will consistently return test creatives. This is to ensure future Prebid.js updates do not break your adapter.


### Step 2: Add a new bidder JS file

1. Create a JS file under `src/adapters` with the name of the bidder, e.g., `rubicon.js`

2. Create an adapter factory function with the signature shown below:

{% highlight js %}

var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var BidderNameAdapter = function BidderNameAdapter() {

    function _callBids(params){}

    // Export the callBids function, so that prebid.js can execute
    // this function when the page asks to send out bid requests.
    return {
        callBids: _callBids
    };
};

module.exports = BidderNameAdapter;

{% endhighlight %}


### Step 3: Design your bid params

Use the `bids.params` object for defining the parameters of your ad requests. The parameters are usually the tag ID and/or the site ID, etc. 

Note that the placement size can be read from the `adUnit` object, so there is no need to put your own here.


### Step 4: Send out bid requests

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
                pagid: '123124',
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


### Step 5: Register bid responses

When the bid response(s) are available, notify Prebid.js immediately, so that your bid can get in the auction as soon as possible. The bidder's API typically has an event listener that notifies you when the bid responses are back.

To register the bid, call the `bidmanager.addBidResponse(adUnitCode, bidObject)` function. To register multiple bids, call the function multiple times.

* If the bid is valid: Use `bidfactory.createBid(1)` to create the `bidObject`.
* If the bid is invalid (no fill or error): Use `bidfactory.createBid(2)` to create the `bidObject`.

Example:

{% highlight js %}

// In the bidder's API callback...

// the bidder API's ad response unit that has info like CPM, creative content
var adUnit;

var bidObject = bidfactory.createBid(1);
bidObject.bidderCode = 'openx';
bidObject.cpm = Number(adUnit.get('pub_rev')) / 1000;
bidObject.ad = adUnit.get('html');
bidObject.width = adUnit.get('width');
bidObject.height = adUnit.get('height');

// send the bidResponse object to bid manager with the adUnitCode.
bidmanager.addBidResponse(adUnitCode, bidObject);

// invalid bid response
bidObject = bidfactory.createBid(2);
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


### Helper functions

**`adloader.loadScript(scriptURL, callback, cacheRequest)`**

Load a script asynchronously. The callback function will be executed when the script finishes loading.

**Examples**

Check out the bidder adapter examples in the [Github repo](https://github.com/prebid/Prebid.js/tree/master/src/adapters).

</div>
