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

A bidder adaptor is responsible for:

1. Given the list of all ad unit tag IDs, send out the bid requests in the most efficient way.
2. Whenever a bid is back, register the bid to Prebid.js. 


### Step 1: New Bidder JS file

1. Create a js file under src/adapters with the name of the bidder. Example: rubicon.js

2. Create a adapter factory function with this signature. Example:

{% highlight js %}

var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var BidderNameAdapter = function BidderNameAdapter() {

    function _callBids(params){}

    // Export the callBids function, so that prebid.js can execute this function
    // when the page asks to send out bid requests.
    return {
        callBids: _callBids
    };
};

module.exports = BidderNameAdapter;

{% endhighlight %}



### Step 2: Send out bid requests

When the page asks Prebid.js to send out bid requests, your bidder's `_callBids(params)` funciton will be executed. This is a good place for you to send out bid requests to your bidder.

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
            // params is custom to the bidder adapter and will
            // be passed through from the configuration as is.
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

Note that you should keep track of `adUnitCode` to bid requests. In the next section this will come in handy.


### Step 3: Register bid responses

When the bid response(s) are available, notify Prebid.js immediately, so that your bid can get in the auction as soon as possible. The bidder's API typically has an event listener when the bid responses are back.

To register the bid, call the `bidmanager.addBidResponse(adUnitCode, bidObject)` function. To register multiple bids, call the funciton multiple times.

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

//send the bidResponse object to bid manager with the adUnitCode.
bidmanager.addBidResponse(adUnitCode, bidObject);

// invalid bid response
bidObject = bidfactory.createBid(2);
bidObject.bidderCode = 'openx';
bidmanager.addBidResponse(adUnitCode, bidObject);

{% endhighlight %}

#### `adUnitCode` in `addBidResponse`

In bidder API's callback, there'll be Id(s) that tie back to the request params in the `bid` object. Building a map from `adUnitCode` to the request param(s)/Id(s) will help you retrive the `adUnitCode` based on the callback.


#### `bidObject` in `addBidResponse`

The required parameters to add into `bidObject` are:

{: .table .table-bordered .table-striped }
|   Key | Scope |    Description     |   Example  |
| :----  |:--------| :-------| :-------|
| `bidderCode` | Required | The bidder code. | `pubmatic` |
| `cpm` | Required | The bid price. We recommend the most granular price a bidder can provide | 3.5764 |
| `width` | Required | The width of the returned creative. | 300 |
| `height` | Required | The height of the returned creative. | 250 |
| `ad` | Required | The creative payload of the returned bid | '<html><h3>I am an ad</h3></html>' |


### Handy helper functions

#### `adloader.loadScript(scriptURL, callback)`

Load a script asynchronously. The callback function will be executed when the script finished loading.

#### Examples

Check out plenty of bidder adaptor examples in [Github adaptors](https://github.com/prebid/Prebid.js/tree/master/src/adapters).

</div>