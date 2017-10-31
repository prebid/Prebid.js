---
layout: page
title: How to add a Prebid 1.0 Bidder Adapter - <font color="red">NEW!</font>
description: Documentation on how to add a new bidder adapter
top_nav_section: dev_docs
nav_section: adapters
---

<div class="bs-docs-section" markdown="1">

# How to Add a Prebid 1.0 Bidder Adapter
{:.no_toc}

{: .alert.alert-warning :}
**This document is a work in progress for Prebid 1.0**  
Feedback welcome - [open an issue](https://github.com/prebid/prebid.github.io/issues) on Github.

At a high level, a bidder adapter is responsible for:

1. Creating the bid requests for the bidder's server.
2. Parsing and registering the bid responses.

This page has instructions for writing your own bidder adapter.  The instructions here try to walk you through some of the code you'll need to write for your adapter.  When in doubt, use [the working adapters in the Github repo](https://github.com/prebid/Prebid.js/tree/master/modules) for reference.

{: .alert.alert-danger :}
As of October 1st, 2017, we will no longer be accepting pull requests for adapters that are not compliant with Prebid 1.0 conventions.

* TOC
{:toc}

## Planning your adapter

With each adapter submission, there are two files required to be in the pull request:

* `modules/exampleBidAdapter.js`: the file containing the code for the adapter
* `modules/exampleBidAdapter.md`: a markdown file containing key information about the adapter:
   * The contact email of the adapter's maintainer.
   * A test ad unit that will consistently return test creatives. This helps us to ensure future Prebid.js updates do not break your adapter.  Note that if your adapter supports video, outstream video, or native, you must also provide example parameters for each type.

Example markdown file:

{% highlight text %}

# Overview

```
Module Name: Example Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@example.com
```

# Description

Module that connects to Example's demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "example",
                       params: {
                           placement: '12345'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[300, 50]],   // a mobile size
               bids: [
                   {
                       bidder: "example",
                       params: {
                           placement: 67890
                       }
                   }
               ]
           }
       ];
```

{% endhighlight %}

### Required adapter conventions

As of Prebid 1.0, adapters must follow the conventions listed below.

In order to provide a fast and safe header bidding environment for publishers, the Prebid.org team reviews all adapters for the following required conventions:

* *Support multiple instances*: All adapters must support the creation of multiple concurrent instances. This means, for example, that adapters cannot rely on mutable global variables.
* *No loading of external libraries*: All code must be present in the adapter, not loaded at runtime.
* *Must support HTTPS*: Within a secure page context, the request to the bidder's server must also be secure.
* *Compressed responses*: All bid responses from the bidder's server must be gzipped.
* *Bid responses may not use JSONP*: All requests must be AJAX with JSON responses.
* *All user-sync activity must be registered via the provided functions*: The platform will place all registered syncs in the page after the auction is complete, subject to publisher configuration.
* *Adapters may not use the `$$PREBID_GLOBAL$$` variable*: Instead, they must load any necessary functions and call them directly.

{: .alert.alert-danger :}
Failure to follow any of the above conventions could lead to delays in approving your adapter for inclusion in Prebid.js.

### Design your bid params

The AdUnit's `bid.params` object will define the parameters of your ad request.  You can include tag ID, site ID, ad size, keywords, and other data, such as video parameters.

For more information about the kinds of information that can be passed using these parameters, see [the existing bidder parameters]({{site.baseurl}}/dev-docs/bidders.html).

A sample AdUnit with parameters for the 'example' bidder:

{% highlight js %}

{
    var adUnits = [{
        code: "top-med-rect",
        sizes: [
            [300, 250],
            [300, 600]
        ]
        bids: [{
            bidder: "example",
            // params is custom to the bidder adapter and will be
            // passed through from the configuration as is.
            params: {
                unit: '3242432',
                pgid: '123124',
                custom: {
                    other: "xyz"
                }
            },
        }]
    }];

{% endhighlight %}

## Create the Adapter

{: .alert.alert-success :}
If you're the type that likes to skip to the answer instead of going through a tutorial, see the <a href="#bidder-example">Full Bid Adapter Example</a> below.

The new code will reside under the modules directory with the name of the bidder suffixed by 'BidAdapter', e.g., `exampleBidAdapter.js`.

Compared to previous versions of Prebid, the new BaseAdapter model saves the adapter from having to make the AJAX call and provides consistency in how adapters are structured. Instead of a single entry point, the BaseAdapter approach defines 4 entry points:

* `isBidRequestValid` - Verify the the `AdUnits.bids`, respond with `true` (valid) or `false` (invalid)
* `buildRequests` - Takes an array of validBidRequests, all of which are guaranteed to have passed the isBidRequestValid() test.
* `interpretResponse` - Parse the response and generate one or more bid objects
* `getUserSyncs` - If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs.

A high level example of the structure:

{% highlight js %}

import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
const BIDDER_CODE = 'example';
export const spec = {
    code: BIDDER_CODE,
    aliases: ['ex'], // short code
    isBidRequestValid: function(bid) {},
    buildRequests: function(validBidRequests[]) {},
    interpretResponse: function(serverResponse, request) {},
    getUserSyncs: function(syncOptions, serverResponses) {}
}
registerBidder(spec);

{% endhighlight %}

### Building the Request

When the page asks Prebid.js for bids, your module's `buildRequests` function will be executed. Building the request will use data from several places:

* *AdUnit params*: The arguments provided by the page are in `validBidRequests` as illustrated below.
* *Transaction ID*: `bidderRequest.bids[].transactionId` should be sent to your server and forwarded to any Demand Side Platforms your server communicates with.
* *Ad Server Currency*: If your service supports bidding in more than one currency, your adapter should call `config.getConfig(currency)` to see if the page has defined which currency it needs for the ad server.
* *Referrer*: Referrer should be passed into your server and utilized there. This is important in contexts like AMP where the original page referrer isn't available directly to the adapter. We suggest using the `utils.getTopWindowUrl()` function to obtain the referrer.

Sample array entry for validBidRequests[]:
{% highlight js %}
[{
  "bidder": "example",
  "bidId": "51ef8751f9aead",
  "params": {
    "cId": "59ac1da80784890004047d89",
    ...
  },
  "adUnitCode": "div-gpt-ad-1460505748561-0",
  "transactionId": "d7b773de-ceaa-484d-89ca-d9f51b8d61ec",
  "sizes": [[320,50],[300,250],[300,600]],
  "bidderRequestId": "418b37f85e772c",
  "auctionId": "18fd8b8b0bd757"
}]
{% endhighlight %}

{: .alert.alert-warning :}
**Prebid 1.0:** Some of these bid request recommendations are new.

{: .alert.alert-success :}
There are several IDs present in the bidRequest object:  
- **Bid ID** is unique across AdUnits and Bidders.  
- **Auction ID** is unique per call to requestBids(), but is the same across AdUnits. And finally,  
- **Transaction ID** is unique for each AdUnit with a call to requestBids, but same across bidders. This is the ID that DSPs need to recognize the same impression coming in from different supply sources.

The ServerRequest objects returned from your adapter have this structure:
 
{: .table .table-bordered .table-striped }
| Attribute | Type             | Description                                                        | Example Value             |
|-----------+------------------+--------------------------------------------------------------------+---------------------------|
| type      | string           | Which HTTP method should be used                                   | GET/POST                  |
| endpoint  | string           | The endpoint for the request.                                      | "http://bids.example.com" |
| data      | string or object | Data to be sent in the POST request. Objects will be sent as JSON. |                           |

Here's a sample block of code returning a ServerRequest object:

{% highlight js %}

return {
    method: 'POST',
    url: URL,
    data: payloadObject
};

{% endhighlight %}

### Interpreting the Response

The `interpretResponse` function will be called when the browser has received the response from your server. The function will parse the response and create a bidResponse object containing one or more bids. The adapter should indicate no valid bids by returning an empty array. An example showing a single bid:

{% highlight js %}

    // if the bid response was empty or an error, return []
    // otherwise parse the response and return a bidResponses array

    // The response body and headers can be retrieved like this:
    //
    // const serverBody = serverResponse.body;
    // const headerValue = serverResponse.headers.get('some-response-header')
    const bidResponses = [];
    const bidResponse = {
        requestId: bidRequest.bidId,
        cpm: CPM,
        width: WIDTH,
        height: HEIGHT,
        creativeId: CREATIVE_ID,
        dealId: DEAL_ID,
        currency: CURRENCY,
        netRevenue: true,
        ttl: TIME_TO_LIVE,
        referrer: REFERER,
        ad: CREATIVE_BODY
    };
    bidResponses.push(bidResponse);
    return bidResponses;

{% endhighlight %}

{: .alert.alert-warning :}
**Prebid 1.0:** There are several new parameters required on the bid response object. Note that that the bidResponse `creativeId` field is different than in 0.x when it was `creative_id`. It's been changed to camel-case to be consistent with the other fields.

The parameters of the `bidObject` are:

{: .table .table-bordered .table-striped }
| Key          | Scope                                       | Description                                                                                                                                     | Example                              |
|--------------+---------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------|
| `requestId`         | Required                                    | The bid ID. Used to tie this bid back to the request.                                                                                           | 12345                                |
| `cpm`        | Required                                    | The bid price. We recommend the most granular price a bidder can provide                                                                        | 3.5764                               |
| `width`      | Required                                    | The width of the returned creative. For video, this is the player width.                                                                        | 300                                  |
| `height`     | Required                                    | The height of the returned creative. For video, this is the player height.                                                                      | 250                                  |
| `ad`         | Required                                    | The creative payload of the returned bid.                                                                                                       | `"<html><h3>I am an ad</h3></html>"` |
| `ttl`        | Required                                    | Time-to-Live - how long (in seconds) Prebid can use this bid.                                                       | 360                                  |
| `creativeId` | Required                                    | A bidder-specific unique code that supports tracing the ad creative back to the source.                                                         | `"123abc"`                           |
| `netRevenue` | Required                                    | Boolean defining whether the bid is Net or Gross. The value `true` is Net. Bidders responding with Gross-price bids should set this to false. | `false`                              |
| `currency`   | Required                                    | 3-letter ISO 4217 code defining the currency of the bid.                                                                               | `"EUR"`                              |
| `vastUrl`    | Either this or `vastXml` required for video | URL where the VAST document can be retrieved when ready for display.                                                                            | `"http://vid.example.com/9876`       |
| `vastXml`    | Either this or `vastUrl` required for video | XML for VAST document to be cached for later retrieval.                                                                                         | `<VAST version="3.0">...`            |
| `dealId`     | Optional                                    | Deal ID | `"123abc"` |

### Register User Syncs

All user ID sync activity must be done in one of two ways:

1. The `getUserSyncs` callback of the BaseAdapter model
2. The `userSync.registerSync` function

{% highlight js %}

{
    getUserSyncs: function(syncOptions, serverResponses) {
        const syncs = []
        if (syncOptions.iframeEnabled) {
            syncs.push({
                type: 'iframe',
                url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
            });
        }
        if (syncOptions.pixelEnabled && serverResponses.length > 0) {
            syncs.push({
                type: 'image',
                url: serverResponses[0].body.userSync.url
            });
        }
        return syncs;
    }
}

{% endhighlight %}

## Supporting Video

{: .alert.alert-warning :}
**Prebid 1.0:** There aren't any differences in video except that there was formerly a separate
document describing how to build a video adapter. That information has been moved here.

There are a few differences for adapters supporting video auctions. Here are the steps to ensure that an
adapter properly supports video:

**Step 1: Register the adapter as supporting video**

Add the `supportedMediaTypes` argument to the spec object, and make sure `video` is in the list:

{% highlight js %}

export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: ['video'],
    ...
}

{% endhighlight %}

**Step 2: Accept video parameters and pass them to your server**

See the [AppNexus AST adapter]({{site.baseurl}}/dev-docs/bidders.html#appnexusAst) for an example of how
video parameters may be passed in from the AdUnit.

**Step 3: Respond with VAST or a VAST URL**

When the bidder returns VAST or a VAST URL in its bid response, it needs to add the result into either `bid.vastXml` or `bid.vastUrl`. For example, here is some [code from the Tremor adapter](https://github.com/prebid/Prebid.js/blob/master/modules/tremorBidAdapter.js#L142) showing how it's done:

{% highlight js %}

function createBid(status, reqBid, response) {
    let bid = bidfactory.createBid(status, reqBid);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (response) {
        bid.cpm = response.price;
        bid.crid = response.crid;
        bid.vastXml = response.adm;
        bid.mediaType = 'video';
    }

    return bid;
}

{% endhighlight %}

## Supporting Native

In order for your bidder to support the native media type, you need 2 things:

1. Your (server-side) bidder needs to respond with a bid that has native information.
2. Your (client-side) bidder adapter needs to unpack the server's bid into a Prebid-compatible bid populated with the required native information.

For example, below is the [code in the AppNexus AST adapter](https://github.com/prebid/Prebid.js/blob/master/modules/appnexusAstBidAdapter.js#L192) that achieves #2.  As you can see, we:

1. Check for native information on the bid response.
2. Fill in the bid's `native` object with information from the bid.

{% highlight js %}

/* Does the bidder respond with native information? */
} else if (rtbBid.rtb.native) {

  const native = rtbBid.rtb.native;

  /* Bidder supports native, so let's populate our Prebid-compatible
  bid with native info */
  bid.native = {
    title: native.title,
    body: native.desc,
    cta: native.ctatext,
    sponsoredBy: native.sponsored,
    image: native.main_img && native.main_img.url,
    icon: native.icon && native.icon.url,
    clickUrl: native.link.url,
    impressionTrackers: native.impression_trackers,
  };

{% endhighlight %}

## Unit Tests

Every adapter submission must include unit tests. See existing test suites in test/spec/modules.

## Migrating from Prebid 0.x to 1.0

During the transition period between Prebid 0.x and 1.0, all adapters should submit pull requests to the master branch. We will rebase to the prebid-1.0 branch regularly.
 
During the transition, please test your adapter with the prebid-1.0 branch.

<a name="bidder-example"></a>

## Full Bid Adapter Example using the BaseAdapter

{% highlight js %}

import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'example';
export const spec = {
        code: BIDDER_CODE,
        aliases: ['ex'], // short code
        /**
         * Determines whether or not the given bid request is valid.
         *
         * @param {BidRequest} bid The bid params to validate.
         * @return boolean True if this is a valid bid, and false otherwise.
         */
        isBidRequestValid: function(bid) {
            return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
        },
        /**
         * Make a server request from the list of BidRequests.
         *
         * @param {validBidRequests[]} - an array of bids
         * @return ServerRequest Info describing the request to the server.
         */
        buildRequests: function(validBidRequests) {
            const payload = {
                // use bidderRequest.bids[] to get bidder-dependent request info

                // if your bidder supports multiple currencies, use config.getConfig(currency)
                // to find which one the ad server needs

                // pull requested transaction ID from bidderRequest.bids[].transactionId
            };
            const payloadString = JSON.stringify(payload);
            return {
                method: 'POST',
                url: ENDPOINT_URL,
                data: payloadString,
            };
        },
        /**
         * Unpack the response from the server into a list of bids.
         *
         * @param {ServerResponse} serverResponse A successful response from the server.
         * @return {Bid[]} An array of bids which were nested inside the server.
         */
        interpretResponse: function(serverResponse, bidRequest) {
            // const serverBody = serverResponse.body;
            // const headerValue = serverResponse.headers.get('some-response-header')
            const bidResponses = [];
            const bidResponse = {
                requestId: bidRequest.bidId,
                cpm: CPM,
                width: WIDTH,
                height: HEIGHT,
                creativeId: CREATIVE_ID,
                dealId: DEAL_ID,
                currency: CURRENCY,
                netRevenue: true,
                ttl: TIME_TO_LIVE,
                referrer: REFERER,
                ad: CREATIVE_BODY
            };
            bidResponses.push(bidResponse);
        };
        return bidResponses;
    },
    
    /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
    getUserSyncs: function(syncOptions, serverResponses) {
        const syncs = []
        if (syncOptions.iframeEnabled) {
            syncs.push({
                type: 'iframe',
                url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
            });
        }
        if (syncOptions.pixelEnabled && serverResponses.length > 0) {
            syncs.push({
                type: 'image',
                url: serverResponses[0].body.userSync.url
            });
        }
        return syncs;
    }
}
registerBidder(spec);

{% endhighlight %}

## Further Reading

+ [The bidder adapter sources in the repo](https://github.com/prebid/Prebid.js/tree/master/modules)

</div>
