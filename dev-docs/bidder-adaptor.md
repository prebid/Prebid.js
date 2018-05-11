---
layout: page
title: How to Add a New Bidder Adapter
description: Documentation on how to add a new bidder adapter
top_nav_section: dev_docs
nav_section: adapters
---

<div class="bs-docs-section" markdown="1">

# How to Add a New Bidder Adapter
{:.no_toc}

At a high level, a bidder adapter is responsible for:

1. Creating the bid requests for the bidder's server.
2. Parsing and registering the bid responses.

This page has instructions for writing your own bidder adapter.  The instructions here try to walk you through some of the code you'll need to write for your adapter.  When in doubt, use [the working adapters in the Github repo](https://github.com/prebid/Prebid.js/tree/master/modules) for reference.

* TOC
{:toc}

## Planning your Adapter

+ [Required Adapter Conventions](#bidder-adaptor-Required-Adapter-Conventions)
+ [Required Files](#bidder-adaptor-Required-Files)
+ [Designing your Bid Params](#bidder-adaptor-Designing-your-Bid-Params)

<a name="bidder-adaptor-Required-Adapter-Conventions" />

### Required Adapter Conventions

In order to provide a fast and safe header bidding environment for publishers, the Prebid.org team reviews all adapters for the following required conventions:

* *Support multiple instances*: All adapters must support the creation of multiple concurrent instances. This means, for example, that adapters cannot rely on mutable global variables.
* *No loading of external libraries*: All code must be present in the adapter, not loaded at runtime.
* *Must support HTTPS*: Within a secure page context, the request to the bidder's server must also be secure.
* *Compressed responses*: All bid responses from the bidder's server must be gzipped.
* *Bid responses may not use JSONP*: All requests must be AJAX with JSON responses.
* *All user-sync activity must be registered via the provided functions*: The platform will place all registered syncs in the page after the auction is complete, subject to publisher configuration.
* *Adapters may not use the `$$PREBID_GLOBAL$$` variable*: Instead, they must load any necessary functions and call them directly.
* *Adapters may not override standard ad server targeting*: Do not override, or set default values for any of the standard targeting variables: hb_adid, hb_bidder, hb_pb, hb_deal, or hb_size, hb_source, hb_format.

{: .alert.alert-danger :}
Failure to follow any of the above conventions could lead to delays in approving your adapter for inclusion in Prebid.js.

{: .alert.alert-danger :}
Pull requests for non-1.0 compatible adapters will not be reviewed or accepted on the legacy branch.

<a name="bidder-adaptor-Required-Files" />

### Required Files

With each adapter submission, there are two files required to be in the pull request:

* `modules/exampleBidAdapter.js`: the file containing the code for the adapter
* `modules/exampleBidAdapter.md`: a markdown file containing key information about the adapter:
   * The contact email of the adapter's maintainer.
   * A test ad unit that will consistently return test creatives. This helps us to ensure future Prebid.js updates do not break your adapter.  Note that if your adapter supports video (instream and/or outstream context) or native, you must also provide example parameters for each type.

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
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
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
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
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

<a name="bidder-adaptor-Designing-your-Bid-Params" />

### Designing your Bid Params

The parameters of your ad request will be stored in the ad unit's `bid.params` object.  You can include tag info, ad size, keywords, and other data such as video parameters.

For more information about the kinds of information that can be passed using these parameters, see the example below, as well as [the existing bidder parameters]({{site.baseurl}}/dev-docs/bidders.html).

{% highlight js %}

{
    var adUnits = [{
        code: "top-med-rect",
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250],
                    [300, 600]
                ]
            }
        },
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

## Creating the Adapter

{: .alert.alert-success :}
If you're the type that likes to skip to the answer instead of going through a tutorial, see the <a href="#bidder-example">Full Bid Adapter Example</a> below.

+ [Overview](#bidder-adaptor-Overview)
+ [Building the Request](#bidder-adaptor-Building-the-Request)
+ [Interpreting the Response](#bidder-adaptor-Interpreting-the-Response)
+ [Registering User Syncs](#bidder-adaptor-Registering-User-Syncs)
+ [Registering on Timeout](#bidder-adaptor-Registering-on-Timout)

<a name="bidder-adaptor-Overview" />

### Overview

The new code will reside under the `modules` directory with the name of the bidder suffixed by 'BidAdapter', e.g., `exampleBidAdapter.js`.

Compared to previous versions of Prebid, the new `BaseAdapter` model saves the adapter from having to make the AJAX call and provides consistency in how adapters are structured. Instead of a single entry point, the `BaseAdapter` approach defines the following entry points:

* `isBidRequestValid` - Verify the the `AdUnits.bids`, respond with `true` (valid) or `false` (invalid).
* `buildRequests` - Takes an array of valid bid requests, all of which are guaranteed to have passed the `isBidRequestValid()` test.
* `interpretResponse` - Parse the response and generate one or more bid objects.
* `getUserSyncs` - If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs.  For more information, see [Registering User Syncs](#bidder-adaptor-Registering-User-Syncs) below.
* `onTimeout` - If the adapter timed out for an auction, the platform will call this function and the adapter may register timeout.  For more information, see [Registering User Syncs](#bidder-adaptor-Registering-User-Syncs) below.

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
    buildRequests: function(validBidRequests[], bidderRequest) {},
    interpretResponse: function(serverResponse, request) {},
    getUserSyncs: function(syncOptions, serverResponses) {},
    onTimeout: function(timeoutData) {}
}
registerBidder(spec);

{% endhighlight %}

<a name="bidder-adaptor-Building-the-Request" />

### Building the Request

When the page asks Prebid.js for bids, your module's `buildRequests` function will be executed. Building the request will use data from several places:

* *Ad Unit Params*: The arguments provided by the page are in `validBidRequests` as illustrated below.
* *Transaction ID*: `bidderRequest.bids[].transactionId` should be sent to your server and forwarded to any Demand Side Platforms your server communicates with.
* *Ad Server Currency*: If your service supports bidding in more than one currency, your adapter should call `config.getConfig(currency)` to see if the page has defined which currency it needs for the ad server.
* *Referrer*: Referrer should be passed into your server and utilized there. This is important in contexts like AMP where the original page referrer isn't available directly to the adapter. The convention is to do something like this: `referrer: config.getConfig('pageUrl') || utils.getTopWindowUrl()`.

Sample array entry for `validBidRequests[]`:

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

{: .alert.alert-success :}
There are several IDs present in the bidRequest object:
- **Bid ID** is unique across ad units and bidders.
- **Auction ID** is unique per call to `requestBids()`, but is the same across ad units.
- **Transaction ID** is unique for each ad unit with a call to `requestBids`, but same across bidders. This is the ID that DSPs need to recognize the same impression coming in from different supply sources.

The ServerRequest objects returned from your adapter have this structure:

{: .table .table-bordered .table-striped }
| Attribute | Type             | Description                                                        | Example Value               |
|-----------+------------------+--------------------------------------------------------------------+-----------------------------|
| `method`  | String           | Which HTTP method should be used.                                  | `POST`                      |
| `url`     | String           | The endpoint for the request.                                      | `"http://bids.example.com"` |
| `data`    | String or Object | Data to be sent in the POST request. Objects will be sent as JSON. |                             |

Here's a sample block of code returning a ServerRequest object:

{% highlight js %}

return {
    method: 'POST',
    url: URL,
    data: payloadObject
};

{% endhighlight %}

<a name="bidder-adaptor-Interpreting-the-Response" />

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
        requestId: BID_ID,
        cpm: CPM,
        width: WIDTH,
        height: HEIGHT,
        creativeId: CREATIVE_ID,
        dealId: DEAL_ID,
        currency: CURRENCY,
        netRevenue: true,
        ttl: TIME_TO_LIVE,
        ad: CREATIVE_BODY
    };
    bidResponses.push(bidResponse);
    return bidResponses;

{% endhighlight %}

The parameters of the `bidObject` are:

{: .table .table-bordered .table-striped }
| Key          | Scope                                       | Description                                                                                                                                   | Example                              |
|--------------+---------------------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------|
| `requestId`  | Required                                    | The bid ID that was sent to `spec.buildRequests` as `bidRequests[].bidId`. Used to tie this bid back to the request.                          | 12345                                |
| `cpm`        | Required                                    | The bid price. We recommend the most granular price a bidder can provide                                                                      | 3.5764                               |
| `width`      | Required                                    | The width of the returned creative. For video, this is the player width.                                                                      | 300                                  |
| `height`     | Required                                    | The height of the returned creative. For video, this is the player height.                                                                    | 250                                  |
| `ad`         | Required                                    | The creative payload of the returned bid.                                                                                                     | `"<html><h3>I am an ad</h3></html>"` |
| `ttl`        | Required                                    | Time-to-Live - how long (in seconds) Prebid can use this bid.                                                                                 | 360                                  |
| `creativeId` | Required                                    | A bidder-specific unique code that supports tracing the ad creative back to the source.                                                       | `"123abc"`                           |
| `netRevenue` | Required                                    | Boolean defining whether the bid is Net or Gross. The value `true` is Net. Bidders responding with Gross-price bids should set this to false. | `false`                              |
| `currency`   | Required                                    | 3-letter ISO 4217 code defining the currency of the bid.                                                                                      | `"EUR"`                              |
| `vastUrl`    | Either this or `vastXml` required for video | URL where the VAST document can be retrieved when ready for display.                                                                          | `"http://vid.example.com/9876`       |
| `vastImpUrl` | Optional; only usable with `vastUrl` and requires prebid cache to be enabled | An impression tracking URL to serve with video Ad                                                                                             | `"http://vid.exmpale.com/imp/134"`   |
| `vastXml`    | Either this or `vastUrl` required for video | XML for VAST document to be cached for later retrieval.                                                                                       | `<VAST version="3.0">...`            |
| `dealId`     | Optional                                    | Deal ID                                                                                                                                       | `"123abc"`                           |

<a name="bidder-adaptor-Registering-User-Syncs" />

### Registering User Syncs

All user ID sync activity should be done using the `getUserSyncs` callback of the `BaseAdapter` model.

Given an array of all the responses from the server, `getUserSyncs` is used to determine which user syncs should occur. The order of syncs in the `serverResponses` array matters. The most important ones should come first, since publishers may limit how many are dropped on their page.

See below for an example implementation.  For more examples, search for `getUserSyncs` in the [modules directory in the repo](https://github.com/prebid/Prebid.js/tree/master/modules).

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

<a name="bidder-adaptor-Registering-on-Timout" />

### Registering on Timeout 

The `onTimeout` function will be called when an adpater timed out for an auction. Adapter can fire a ajax or pixel call to register a timeout at thier end. 

Sample data received to this function:

{% highlight js %}
{ 
  "bidder": "example",
  "bidId": "51ef8751f9aead",
  "params": {
    ...
  },
  "adUnitCode": "div-gpt-ad-1460505748561-0",
  "timeout": 3000,
  "auctionId": "18fd8b8b0bd757"
}
{% endhighlight %}

## Supporting Video

Follow the steps in this section to ensure that your adapter properly supports video.

### Step 1: Register the adapter as supporting video

Add the `supportedMediaTypes` argument to the spec object, and make sure `video` is in the list:

{% highlight js %}

export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: ['video'],
    ...
}

{% endhighlight %}

{: .alert.alert-info :}
If your adapter supports banner and video media types, make sure to include `'banner'` in the `supportedMediaTypes` array as well

### Step 2: Accept video parameters and pass them to your server

Video parameters are often passed in from the ad unit in a `video` object.

The design of these parameters may vary depending on what your server-side bidder accepts.  If possible, we recommend using the video parameters in the [OpenRTB specification](https://iabtechlab.com/specifications-guidelines/openrtb/).

For examples of video parameters accepted by different adapters, see [the list of bidders with video demand]({{site.baseurl}}/dev-docs/bidders.html#bidder-video-native).

#### Ingesting the Video Context

Video ad units have a publisher-defined video context, which can be either `'instream'` or `'outstream'`.  Video demand partners can choose to ingest this signal for targeting purposes.  For example, the ad unit shown below has the outstream video context:

```javascript
...
mediaTypes: {
    video: {
        context: 'outstream'
    },
},
...
```

You can check for the video context in your adapter as shown below, and then modify your response as needed:

```javascript
const videoMediaType = utils.deepAccess(bid, 'mediaTypes.video');
const context        = utils.deepAccess(bid, 'mediaTypes.video.context');

if (bid.mediaType === 'video' || (videoMediaType && context !== 'outstream')) {
    /* Do something here. */
}
```

#### Outstream Video Renderers

As described in [Show Outstream Video Ads]({{site.baseurl}}/dev-docs/show-outstream-video-ads.html), for an ad unit to play outstream ads, a "renderer" is required.  A renderer is the client-side code (usually a combination of JavaScript, HTML, and CSS) responsible for displaying a creative on a page.  A renderer must provide a player environment capable of playing a video creative (most commonly an XML document).

If possible, we recommend that publishers associate a renderer with their outstream video ad units.  By doing so, all video-enabled demand partners will be able to participate in the auction, regardless of whether a given demand partner provides a renderer on its bid responses.  Prebid.js will always invoke a publisher-defined renderer on a given ad unit.

However, if the publisher does not define a renderer, you will need to return a renderer with your bid response if you want to participate in the auction for outstream ad unit.

### Step 3: Respond with a VAST URL or raw VAST XML

The returned VAST URL or raw VAST XML should be added into `bid.vastUrl` or `bid.vastXml`, respectively.

For example:

{% highlight js %}

function createBid(status, reqBid, response) {
    let bid = bidfactory.createBid(status, reqBid);

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

In order for your bidder to support the native media type:

1. Your (server-side) bidder needs to return a response that contains native assets.
2. Your (client-side) bidder adapter needs to unpack the server's response into a Prebid-compatible bid response populated with the required native assets.
3. Your bidder adapter must be capable of ingesting the required and optional native assets specified on the `adUnit.mediaTypes.native` object, as described in [Show Native Ads]({{site.baseurl}}/dev-docs/show-native-ads.html).

The adapter code samples below fulfills requirement #2, unpacking the server's reponse and:

1. Checking for native assets on the response.
2. If present, filling in the `native` object with those assets.

{% highlight js %}

/* Does the bidder respond with native assets? */
else if (rtbBid.rtb.native) {

    /* If yes, let's populate our response with native assets */

    const nativeResponse = rtbBid.rtb.native;

    bid.native = {
        title: nativeResponse.title,
        body: nativeResponse.desc,
        cta: nativeResponse.ctatext,
        sponsoredBy: nativeResponse.sponsored,
        image: nativeResponse.main_img && nativeResponse.main_img.url,
        icon: nativeResponse.icon && nativeResponse.icon.url,
        clickUrl: nativeResponse.link.url,
        impressionTrackers: nativeResponse.impression_trackers,
    };
}

{% endhighlight %}

As of the [0.34.1 release](https://github.com/prebid/Prebid.js/releases/tag/0.34.1), a bidder may optionally return the height and width of a native `image` or `icon` asset.

If your bidder does return the image size, you can expose the image dimensions on the bid response object as shown below.

```javascript
    /* Does the bidder respond with native assets? */
    else if (rtbBid.rtb.native) {

        const nativeResponse = rtbBid.rtb.native;

        /* */

        bid.native = {
            title: nativeResponse.title,
            image: {
              url: nativeResponse.img.url,
              height: nativeResponse.img.height,
              width: nativeResponse.img.width,
            },
            icon: nativeResponse.icon.url,
        };
    }
```

The targeting key `hb_native_image` (about which more [here]({{site.baseurl}}/adops/setting-up-prebid-native-in-dfp.html) (ad ops setup) and [here]({{site.baseurl}}/dev-docs/show-native-ads.html) (engineering setup)) will be set with the value of `image.url` if `image` is an object.

If `image` is a string, `hb_native_image` will be populated with that string (a URL).

## Adding Unit Tests

Every adapter submission must include unit tests.  For details about adapter testing requirements, see the **Writing Tests** section of [CONTRIBUTING.md](https://github.com/prebid/Prebid.js/blob/master/CONTRIBUTING.md).

For example tests, see [the existing adapter test suites](https://github.com/prebid/Prebid.js/tree/master/test/spec/modules).

<a name="bidder-example"></a>

## Full Bid Adapter Example

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
                /*
                Use `bidderRequest.bids[]` to get bidder-dependent
                request info.

                If your bidder supports multiple currencies, use
                `config.getConfig(currency)` to find which one the ad
                server needs.

                Pull the requested transaction ID from
                `bidderRequest.bids[].transactionId`.
                */
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
            // const serverBody  = serverResponse.body;
            // const headerValue = serverResponse.headers.get('some-response-header');
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

    /**
     * Register bidder specific code, which will execute if bidder timed out after an auction
     * @param {data} Containing timeout specific data
     */
    onTimeout: function(data) {
        // Bidder specifc code
    }    
}
registerBidder(spec);

{% endhighlight %}

## Further Reading

+ [The bidder adapter sources in the repo](https://github.com/prebid/Prebid.js/tree/master/modules)

</div>
