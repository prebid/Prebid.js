---
layout: page
title: How to Add a New Video Bidder Adapter
description: Documentation on how to add a new video bidder adapter
pid: 26
top_nav_section: dev_docs
nav_section: adapters
---

<div class="bs-docs-section" markdown="1">

# How to Add a New Video Bidder Adapter
{:.no_toc}

At a high level, a bidder adapter is responsible for:

1. Sending out bid requests to the ad server
2. Registering the bids that are returned with Prebid.js

This page has instructions for writing your own video-enabled bidder adapter.  The instructions here try to walk you through some of the code you'll need to write for your adapter.

When in doubt, use an adapter that already has support for video for reference, such as [the AppNexus AST adapter in the Github repo](https://github.com/prebid/Prebid.js/blob/master/modules/appnexusAstBidAdapter.js).  (The code samples and descriptions below are based on it.)

* TOC
{:toc}

## Step 1: Prepare prerequisites for a pull request

In your PR to add the new adapter, please provide the following information:

- The contact email of the adapter's maintainer.
- A test ad unit that will consistently return test creatives. This helps us to ensure future Prebid.js updates do not break your adapter.
- Any other information listed as required in [CONTRIBUTING.md](https://github.com/prebid/Prebid.js/blob/master/CONTRIBUTING.md).

## Step 2: Add a new bidder JS file

1. Create a JS file under `modules` with the name of the bidder suffixed with 'BidAdapter', e.g., `xyzBidAdapter.js`

2. Your adapter should export the `callBids` function.  Prebid.js
   executes this function when the page asks to send out bid requests.

{% highlight js %}
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';       // useful functions
import { ajax } from 'src/ajax';          // recommended AJAX library
import { STATUS } from 'src/constants';

// This constant is used when adding video params to the tag below.
// You should use params that are understood by your bidder.
const VIDEO_TARGETING = ['id', 'mimes', 'minduration',
                         'maxduration', 'startdelay', 
                         'skippable', 'playback_method', 
                         'frameworks'];

function xyzBidAdapter() {
    let baseAdapter = Adapter.createNew('xyzBidAdapter');

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

adaptermanager.registerBidAdapter(new XYZBidAdapter, 'xyz', {
  supportedMediaTypes: ['video']
});
module.exports = xyzBidAdapter;
{% endhighlight %}

## Step 3: Design your bid params

Use the `bid.params` object for defining the parameters of your ad request.  You can include tag ID, site ID, ad size, keywords, and other data, such as video bidding information.

For more information about the kinds of information that can be passed using these parameters, see [the list of bidder parameters]({{site.baseurl}}/dev-docs/bidders.html).

In order to make sure your adapter supports video, you'll need to:

1. Add a `video` object to your adapter's bid parameters like the one in the [AppNexus AST adapter]({{site.baseurl}}/dev-docs/bidders.html#appnexusAst).  To see an example showing how those video params are processed and added to the ad tag, see [the AST adapter's implementation of the `callBids` function](https://github.com/prebid/Prebid.js/blob/master/modules/appnexusAstBidAdapter.js).

2. Your bidder will have to support returning a VAST URL somewhere in its bid response.  Each new bidder adapter added to Prebid.js will have to support its own video URL.  For more information, see the implementation of [pbjs.buildMasterVideoTagFromAdserverTag](https://github.com/prebid/Prebid.js/blob/master/src/prebid.js#L656).

## Step 4: Send out bid requests

When the page asks Prebid.js to send out bid requests, your bidder's `callBids(bidRequest)` function will be executed, sending out bid requests to your bidder.

The `bidRequest` object contains information about the bids in the request as shown below.  This example uses an AppNexus AST video bid request, so keep in mind not everything will be the same for your own bidder.

{% highlight js %}
{
  "bidderCode": "appnexusAst",
  "requestId": "52ddd9cc-8f77-4f54-91cb-b49b78f02292",
  "bidderRequestId": "11919bf315f56d",
  "bids": [
    {
      "bidder": "appnexusAst",
      "params": {
        "placementId": "10433394"
      },
      "placementCode": "/19968336/header-bid-tag-0",
      "mediaType": "video",
      "sizes": [
        [
          300,
          250
        ],
        [
          300,
          300
        ]
      ],
      "bidId": "230a95a8ac95a9",
      "bidderRequestId": "11919bf315f56d",
      "requestId": "52ddd9cc-8f77-4f54-91cb-b49b78f02292"
    }
  ],
  "start": 1486418703275,
  "auctionStart": 1486418703274,
  "timeout": 3000
}
{% endhighlight %}

Note that you should keep track of the `adUnitCode` in bid requests (this is also known as the "placement code" by some bidders).  You'll need this later on when you [register the bid response with the bid manager](#register-bid-response-bid-manager).

## Step 5: Register bid responses

When the bid response(s) are available, notify Prebid.js immediately, so that your bid can get into the auction as soon as possible. A bidder's API will usually have an event listener that notifies you when the bid responses are back.

{: .alert.alert-warning :}
**IMPORTANT NOTE FOR VIDEO BIDDERS**  
If your bidder supports serving video ads, it needs to provide a VAST video URL in its response.  On the adapter side, your implementation of `createBid` needs to add the VAST URL to the bid.  For an example implementation, see the implementation of `createBid` in the [AppNexus AST adapter](https://github.com/prebid/Prebid.js/blob/master/modules/appnexusAstBidAdapter.js).

### Create the bid response object

If the bid is valid, create the bid response as shown below, matching the bid request/response pair. For details about the status codes, see [constants.json](https://github.com/prebid/Prebid.js/blob/master/src/constants.json).

{% highlight js %}
var utils      = require('../utils.js');
var bidfactory = require('../bidfactory.js');

var bidRequest  = utils.getBidRequest(id);
var bidResponse = bidfactory.createBid(STATUS.GOOD, bidRequest);
{% endhighlight %}

If the bid is invalid (no fill or error), create the `bidObject` as shown below.

{% highlight js %}
var bidRequest  = utils.getBidRequest(id);
var bidResponse = bidfactory.createBid(STATUS.NO_BID, bidRequest);
{% endhighlight %}

### Add info to the bid response

Once you've created the bid response, assuming it's valid, you must add more video-specific information:

+ Player width
+ Player height
+ VAST URL

Note that you'll have to modify the example code below to match the parameters returned by your bidder.  We've also omitted a lot of error-checking.  You can refer to the [AppNexus AST adapter implementation](https://github.com/prebid/Prebid.js/blob/master/modules/appnexusAstBidAdapter.js) for details.

{% highlight js %}
var baseAdapter = require('baseAdapter.js');

// Pull the ad object out of your bidder's response.
var ad = getRtbBid(tag);

// The bid request needs a code to identify the bidder.
bidResponse.bidderCode = 'yourBidder';

// What is the bid price?
bidResponse.cpm = ad.cpm;

// Video-specific information: player width and height, and VAST URL.
bidResponse.width   = ad.rtb.video.player_width;
bidResponse.height  = ad.rtb.video.player_height;
bidResponse.vastUrl = ad.rtb.video.asset_url;
{% endhighlight %}

<a name="register-bid-response-bid-manager" />

### Register the bid response with the bid manager

Now that you've added the required information to the bid response, you must register the response with the bid manager by calling the `bidmanager.addBidResponse(adUnitCode, bidObject)` function. To register multiple bid responses, call the function multiple times.

{% highlight js %}
bidmanager.addBidResponse(adUnitCode, bidObject);
{% endhighlight %}

**`adUnitCode` in `addBidResponse`**

In bidder API's callback, there'll be ID(s) that tie back to the request params in the `bid` object. Building a map from `adUnitCode` to the request param(s)/ID(s) will help you retrieve the `adUnitCode` based on the callback.

## Helper functions

**`adloader.loadScript(scriptURL, callback, cacheRequest)`**

<div class="alert alert-danger" role="alert">
<p>
Note that loading external code into your adapter will be prohibited starting with Prebid 1.0.
</p>
</div>

Load a script asynchronously. The callback function will be executed when the script finishes loading.

Use this with the `cacheRequest` argument set to `true` if the script you're loading is a library or something else that doesn't change between requests.  It will cache the script so you don't have to wait for it to load before firing the supplied callback.

## Further Reading

+ [How to Add a New Bidder Adapter]({{site.baseurl}}/dev-docs/bidder-adaptor.html)

+ [The bidder adapter sources in the repo](https://github.com/prebid/Prebid.js/blob/master/modules)

</div>
