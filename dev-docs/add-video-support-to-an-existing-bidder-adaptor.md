---
layout: page
title: Add Video Support to an Existing Bidder Adaptor
description: Documentation on how to add video support to an existing bidder adaptor
pid: 27
top_nav_section: dev_docs
nav_section: adaptors
---

<div class="bs-docs-section" markdown="1">

# Add Video Support to an Existing Bidder Adaptor
{:.no_toc}

This page has instructions for updating your existing bidder adaptor with support for  video bidding.

When in doubt, use an adaptor that already has support for video for reference, such as [the AppNexus AST adaptor in the Github repo](https://github.com/prebid/Prebid.js/blob/master/src/adapters/appnexusAst.js).  (The code samples and descriptions below are based on it.)

* TOC
{:toc}

## Step 1. Update your bid params

In order to make sure your adaptor supports video, you'll need to:

1. Add a `video` object to your adapter's bid parameters like the one in the [AppNexus AST adapter]({{site.github.url}}/dev-docs/bidders.html#appnexusAst).  To see an example showing how those video params are processed and added to the ad tag, see [the AST adapter's implementation of the `callBids` function](https://github.com/prebid/Prebid.js/blob/master/src/adapters/appnexusAst.js).

2. Your bidder will have to support returning a VAST URL somewhere in its bid response.  Each new bidder adaptor added to Prebid.js will have to support its own video URL.  For more information, see the implementation of [pbjs.buildMasterVideoTagFromAdserverTag](https://github.com/prebid/Prebid.js/blob/master/src/prebid.js#L656).

## Step 2. Add video information to the bid response

Once you've created the bid response, assuming it's valid, you must add more video-specific information:

+ Player width
+ Player height
+ VAST URL

Note that you'll have to modify the example code below to match the parameters returned by your bidder.  We've also omitted a lot of error-checking.  You can refer to the [AppNexus AST adapter implementation](https://github.com/prebid/Prebid.js/blob/master/src/adapters/appnexusAst.js#L228) for details.

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

## Step 3. Update `adapters.json`

Finally, add `"video"` to the array of media types your adapter supports.

```javascript
{
  "yourBidder": {
    "supportedMediaTypes": ["video"]
  }
}
```

## Related Topics

+ [How to Add a New Video Bidder Adaptor]({{site.github.url}}/dev-docs/how-to-add-a-new-video-bidder-adaptor.html)

</div>
