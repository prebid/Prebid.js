---
layout: page
title: How to Add a New Video Bidder Adaptor
description: Documentation on how to add a new video bidder adaptor
pid: 26
top_nav_section: dev_docs
nav_section: adaptors
---

<div class="bs-docs-section" markdown="1">

# How to Add a New Video Bidder Adaptor
{:.no_toc}

At a high level, a bidder adaptor is responsible for:

1. Sending out bid requests to the ad server
2. Registering the bids that are returned with Prebid.js

This page has instructions for writing your own video-enabled bidder adaptor.  The instructions here try to walk you through some of the code you'll need to write for your adaptor.

When in doubt, use an adaptor that already has support for video for reference, such as [the AppNexus AST adaptor in the Github repo](https://github.com/prebid/Prebid.js/blob/master/src/adaptors/appnexusAst.js).  (The code samples and descriptions below are based on it.)

* TOC
{:toc}

## Step 1: Prepare prerequisites for a pull request

In your PR to add the new adapter, please provide the following information:

- The contact email of the adapter's maintainer.
- A test ad unit that will consistently return test creatives. This helps us to ensure future Prebid.js updates do not break your adapter.
- Any other information listed as required in [CONTRIBUTING.md](https://github.com/prebid/Prebid.js/blob/master/CONTRIBUTING.md).

## Step 2: Add a new bidder JS file

1. Create a JS file under `src/adapters` with the name of the bidder,
   e.g., `rubicon.js`

2. Your adapter should export the `callBids` function.  Prebid.js
   executes this function when the page asks to send out bid requests.

{% highlight js %}
import Adapter    from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';

// This constant is used when adding video params to the tag below.
// You should use params that are understood by your bidder.
const VIDEO_TARGETING = ['id', 'mimes', 'minduration',
                         'maxduration', 'startdelay', 
                         'skippable', 'playback_method', 
                         'frameworks'];

function BidderNameAdapter() {

    let baseAdapter = Adapter.createNew('bidderNameAdaptor');

    baseAdapter.callBids = function(bidRequest) {
      // Add your implementation here.
      const bids = bidRequest.bids || [];
      const tags = bids
        .map(bid => {
            // ... other code ...
            if (bid.params.video) {
              tag.video = {};
              // place any valid video params on the tag
              Object.keys(bid.params.video)
                .filter(param => VIDEO_TARGETING.includes(param))
                .forEach(param => tag.video[param] = bid.params.video[param]);
            }
            // ... other code ...
        return tag;
        });
    }

    // ... other code ...
}

module.exports = BidderNameAdapter;
{% endhighlight %}

## Step 3: Design your bid params

Use the `bid.params` object for defining the parameters of your ad request. At a minimum, you should include the tag ID and the  site ID.  You can also include ad sizes, keywords, and other data, such as video bidding information.

For more information about the kinds of information that can be passed using these parameters, see [the list of bidder parameters]({{site.github.url}}/dev-docs/bidders.html).

In order to make sure your adaptor supports video, you'll need to:

1. Add a `video` object to your adapter's bid parameters like the one in the [AppNexus AST adapter]({{site.github.url}}/dev-docs/bidders.html#appnexusAst).  To see an example showing how those video params are processed and added to the ad tag, see [the AST adapter's implementation of the `callBids` function](https://github.com/prebid/Prebid.js/blob/master/src/adapters/appnexusAst.js).

2. Your bidder will have to support returning a DFP VAST URL somewhere in its bid response.  Each new bidder adaptor added to Prebid.js will have to support its own video URL.  For more information, see the implementation of [pbjs.buildMasterVideoTagFromAdserverTag](https://github.com/prebid/Prebid.js/blob/master/src/prebid.js#L656).

## Step 4: Send out bid requests

When the page asks Prebid.js to send out bid requests, your bidder's `callBids(bidRequest)` function will be executed, sending out bid requests to your bidder.

The `bidRequest` object contains information about the bids configured in the request as shown below.

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

Note that you should keep track of the `adUnitCode` in bid requests (this is also known as the "placement code" by some bidders). In the next section this will come in handy.

## Step 5: Register bid responses

When the bid response(s) are available, notify Prebid.js immediately, so that your bid can get into the auction as soon as possible. A bidder's API will usually have an event listener that notifies you when the bid responses are back.

To register the bid, call the `bidmanager.addBidResponse(adUnitCode, bidObject)` function. To register multiple bids, call the function multiple times.  Here's one way to do it:

```javascript
Object.keys(bidRequests)
  .map(bidId => bidRequests[bidId].placementCode)
  .forEach(placementCode => {
    bidmanager.addBidResponse(placementCode, createBid(STATUS.NO_BID));
  });
```

If the bid is valid, create the `bidObject` like so, matching the bid request/response pair:

```
import { getBidRequest } from '../utils.js';
var bidRequest = getBidRequest(id);
var bid = bidfactory.createBid(1, bidRequest);
```

A status of `1` means the bid is valid.  For details about the status codes, see [constants.json](https://github.com/prebid/Prebid.js/blob/master/src/constants.json).

If the bid is invalid (no fill or error), create the `bidObject` like so:

```
import { getBidRequest } from '../utils.js';
var bidRequest = getBidRequest(id);
var bid = bidfactory.createBid(2, bidRequest);
```

A status of `2` means "no bid".

{: .alert.alert-info :}
**IMPORTANT NOTE FOR VIDEO BIDDERS**  
If your bidder supports serving video ads, it needs to provide a VAST video URL in its response.  On the adapter side, your implementation of `createBid` needs to add the VAST URL to the bid.  For an example implementation, see the implementation of `createBid` in the [AppNexus AST adapter](https://github.com/prebid/Prebid.js/blob/master/src/adapters/appnexusAst.js).

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

## Step 6. Update `adapters.json`

Finally, add `"video"` to the array of media types your adapter supports.

```javascript
{
  "bidderName": {
    "supportedMediaTypes": ["video"]
  }
}
```

## Helper functions

**`adloader.loadScript(scriptURL, callback, cacheRequest)`**

Load a script asynchronously. The callback function will be executed when the script finishes loading.

Use this with the `cacheRequest` argument set to `true` if the script you're loading is a library or something else that doesn't change between requests.  It will cache the script so you don't have to wait for it to load before firing the supplied callback.

For usage examples, see [the working adapters in the repo](https://github.com/prebid/Prebid.js/tree/master/src/adapters).

## Further Reading

+ [How to Add a New Bidder Adapter](http://{{site.github.url}}/dev-docs/bidder-adaptor.html)

+ [The bidder adapter sources in the repo](https://github.com/prebid/Prebid.js/tree/master/src/adapters)

</div>
