---
layout: page
title: Show Outstream Video Ads
description: Show Outstream Video Ads with Prebid.js
pid: 10
top_nav_section: dev_docs
nav_section: prebid-video
---

<div class="bs-docs-section" markdown="1">

# Show Outstream Video Ads
{: .no_toc}

Unlike instream video ads, which require you to have your own video inventory, Outstream video ads can be shown on any web page, even pages that only have text content.

This page has information you'll need to set up Prebid.js to show outstream video.

Other than using a slightly different ad unit in your Prebid code on the page, you shouldn't have to make any major engineering changes from a standard Prebid setup.

There should be no changes required on the ad ops side, since the outstream units use the standard Prebid creative, line item targeting setup, etc.

Note that you have the option to show outstream ads with or without an ad server.  For more information, see the instructions below.

* TOC
{:toc }

## Prerequisites

+ Demand from a bidder adapter that supports the `"video-outstream"` media type, and returns a renderer for outstream video in its bid response
+ For more technical information about renderers, see [the pull request adding the 'Renderer' type](https://github.com/prebid/Prebid.js/pull/1082)

## Option 1. With an ad server

This section will take you through the code you need to write to show outstream video ads using Prebid.js.

### Step 1. Set up outstream video slot sizes
{: .no_toc}

In your standard Prebid preamble in the header, configure slot sizes to suit your page layout and/or the available demand for those sizes.

{% highlight js %}

var pbjs = pbjs || {};

// ...

var rightSlotSizes = [[ 300, 250 ], [ 300, 600 ], [ 300, 250 ], [ 100, 100 ]];

// ...

{% endhighlight %}

### Step 2. Set up your ad units with the outstream video media type
{: .no_toc}

Still in the header, set up your ad units with the `video-outstream` media type.

As far as what fields are supported in the `video` object, that will depend on the rendering options supported by your preferred bidder adaptor(s).  For more information, see [Bidders' Params]({{site.github.url}}/dev-docs/bidders.html).

{% highlight js %}

var videoAdUnits = [
  {
    code: 'video1',
    sizes: [ 640, 480 ],
    mediaType: 'video-outstream',
    bids: [
      {
        bidder: 'appnexusAst',
        params: {
          placementId: '5768085',
          video: {
            skippable: true,
            playback_method: [ 'auto_play_sound_off' ]
          }
        }
      }
    ]
  },
  {
    code: 'video2',
    sizes: [ 640, 480 ],
    mediaType: 'video-outstream',
    bids: [
      {
        bidder: 'appnexusAst',
        params: {
          placementId: '5768085',
          video: {
            skippable: true,
            playback_method: [ 'auto_play_sound_off' ]
          }
        }
      }
    ]
  }
];

{% endhighlight %}

### Step 3. Show ads on the page as normal
{: .no_toc}

In the body of the page, insert your ads as usual:

{% highlight html %}

<div id='video1'>
  <p>Prebid Outstream Video Ad</p>
  <script type='text/javascript'>
    googletag.cmd.push(function () {
      googletag.display('video2');
    });
  </script>
</div>

{% endhighlight %}

## Option 2. Without an Ad Server

You can show outstream video ads directly from a demand partner without going through an ad server.

In this section we'll explain the setup at a high level. For a live example showing all the details, see [Outstream without an Ad Server](http://acdn.adnxs.com/prebid/demos/outstream-without-adserver/).

### Step 1. Set up ad units with the outstream video media type
{: .no_toc}

Set up your video ad units with the outstream video media type as shown below.  Note that the `code` in your video ad unit must match a div ID in your page's body where the ad will be inserted.

{% highlight js %}
// Prebid outstream video adUnit
var videoAdUnits = [{
    code: 'video1',
    sizes: [ 640, 480 ],
    mediaType: 'video-outstream',
    bids: [
        {
            bidder: 'appnexusAst',
            params: {
                placementId: '5768085',
                video: {
                    skippable: true,
                    playback_method: [ 'auto_play_sound_off' ]
                }
            }
        }
    ]
}];
{% endhighlight %}

### Step 2. Request bids, and render the returned ad in a callback
{: .no_toc}

In the Prebid.js event queue, you'll need to add a function that:

1. Adds your video ad units
2. Requests bids, adding a callback that:
    1. Gets the targeting for your ad unit
    2. Renders the ad

{% highlight js %}
pbjs.que.push(function () {
    pbjs.addAdUnits(videoAdUnits);
    pbjs.requestBids({
        timeout: 3000,
        bidsBackHandler: function (bids) {
            /*
            `getAdServerTargetingForAdUnitCode` is used as an easy
            way to get the ad ID, it doesn't actually require you
            to use an ad server.
            */
            var video1 = pbjs.getAdserverTargetingForAdUnitCode('video1');
            pbjs.renderAd(document, video1.hb_adid);
        }
    });
});
{% endhighlight %}

For more information, see the API documentation for:

+ [requestBids]()
+ [getAdserverTargetingForAdUnitCode]()
+ [renderAd]()

## Option 3. With a Publisher-defined Renderer

An outstream bid response is accompanied by a video renderer in the form of a URL that points to a script containing the renderer software.  This software is used by Prebid.js to load and play the winning outstream bid.

If you would prefer to use a different renderer than the one provided in the bid response, you can specify that renderer on a per-outstream-ad-unit basis.  This renderer will be used to load and play the outstream ad, instead of the renderer that is supplied with the bid.  If both a publisher-supplied ad unit renderer and a bid renderer are present, the publisher-supplied renderer will be used.

To use a publisher-defined renderer, add a `renderer` property to your outstream ad unit as shown below.  Other than the ad unit, the rest of the setup will be the same as for [Option 1. With an ad server](#option-1-with-an-ad-server).

{% highlight js %}

pbjs.addAdUnit({
    code: 'video1',
    sizes: [640, 480],
    mediaType: 'video-outstream',
    renderer: {
        /* URL pointing to the render script */
        url: 'http://cdn.adnxs.com/renderer/video/ANOutstreamVideo.js',

        /* Function that tells Prebid.js how to use the script from
        `url` to render the ad */
        render: function(bid) {
            ANOutstreamVideo.renderAd({
                targetId: bid.adUnitCode,
                adResponse: bid.adResponse,
            });
        }
    },
    bids: [{
        bidder: 'appnexusAst',
        params: {
            placementId: '5768085',
            video: {
                skippable: true,
                playback_method: ['auto_play_sound_off']
            }
        }
    }]
});

{% endhighlight %}

## Working Examples

Below, find links to end-to-end "working examples" demonstrating Prebid Outstream:

+ [AppNexus vs. Unruly](http://acdn.adnxs.com/prebid/alpha/unrulydemo.html)
+ [Outstream without an Ad Server](http://acdn.adnxs.com/prebid/demos/outstream-without-adserver/)

## Related Topics

+ [Outstream Video Example]({{site.github.url}}/dev-docs/examples/outstream-video-example.html)

</div>
