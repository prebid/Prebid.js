---
layout: page
title: Show Video Ads with DFP
description:
pid: 0
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-video
---

<div class="bs-docs-section" markdown="1">

# Show Video Ads with DFP (Beta)
{: .no_toc}

In this tutorial, we'll show how to set up Prebid to show a video ad
from DFP.  We'll use the [Video.js](http://videojs.com/) player and
the AppNexus bidder, but the principles are the same across
different video players and video-enabled bidders.

* TOC
{:toc }

## Prerequisites

The code example below was built using the following libraries:

+ [video.js](http://videojs.com/) version 5.9.2
+ MailOnline's [videojs-vast-vpaid plugin](https://github.com/MailOnline/videojs-vast-vpaid) version 2.0.2

Also, you need to make sure to build Prebid.js with:

+ Support for at least one video-enabled bidder
+ Support for the `dfpAdServerVideo` ad server adapter, which will provide the video ad support

For example, to build with the AppNexus bidder adapter and the DFP
Video ad server adapter, use the following command:

```bash
gulp build --modules=dfpAdServerVideo,appnexusBidAdapter
```

For more information about how to build with modules, see the [Prebid.js project README](https://github.com/prebid/Prebid.js/blob/master/README.md#build-optimization).

Finally, your ad ops team needs to have set up line items in DFP
following the instructions at
[Setting up Prebid Video in DFP]({{site.baseurl}}/adops/setting-up-prebid-video-in-dfp.html).

## Implementation

This section will take you through the code you need to write to show
video ads using Prebid.js and Video.js.

### 1. Create a video ad unit

First you need a video ad unit.  It should look something like this.
Don't forget to add your own valid placement ID.

```javascript
var videoAdUnit = {
    code: 'video',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [640, 480]
        },
    },
    bids: [{
        bidder: 'appnexus',
        params: {
            placementId: 13232361,
            video: {
                skippable: true,
                playback_methods: ['auto_play_sound_off']
            }
        }
    }]
};
```

### 2. Implement Custom Price Buckets

By default, Prebid.js caps all CPMs at $20.  As a video seller, you may expect to see CPMs over $20.  In order to receive those bids, you'll need to implement custom price buckets using the [`setPriceGranularity`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#customCPMObject) method.

For instructions, see [Custom Price Bucket with `setPriceGranularity`]({{site.baseurl}}/dev-docs/examples/custom-price-buckets.html).

### 3. Request bids, build video URL

Next, we need to do the standard Prebid "add ad units and request bids" dance.

In the example below, our callback builds the video URL the player needs using the `buildVideoUrl` method from the DFP ad server module that we built into our copy of Prebid.js in the **Prerequisites** section.

For more information, see the API documentation for [pbjs.adServers.dfp.buildVideoUrl]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.adServers.dfp.buildVideoUrl).  Understanding the arguments to this method is *especially* important if you plan to pass any custom parameters to DFP.  The `params` key in the argument to `buildVideoUrl` supports all parameters from the [DFP API](https://support.google.com/dfp_premium/answer/1068325?hl=en).

```javascript
pbjs.que.push(function() {
    pbjs.addAdUnits(videoAdUnit);

    pbjs.setConfig({
        /* Or whatever your preferred video cache URL is */
        cache: {
            url: 'https://prebid.adnxs.com/pbc/v1/cache'
        }
    });

    pbjs.requestBids({
        bidsBackHandler: function(bids) {
            var videoUrl = pbjs.adServers.dfp.buildVideoUrl({
                adUnit: videoAdUnit,
                params: {
                    iu: '/19968336/prebid_cache_video_adunit'
                }
            });
            invokeVideoPlayer(videoUrl);
        }
    });
});
```

#### Notes on Prebid Cache

You can show video ads even if Prebid Cache is disabled.  However, there are some conditions:

+ In general, video-enabled bidders must supply either `bid.vastUrl` or `bid.vastXml` on their responses, and they may supply both.
+ If you have Prebid Cache disabled, and the bidder supplies only `bid.vastXml` in its bid response, [`pbjs.adServers.dfp.buildVideoUrl`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.adServers.dfp.buildVideoUrl) will not be able to generate a video ad tag URL from that response, and it will be dropped from the auction.
+ If `options.url` is passed as an argument to [`pbjs.adServers.dfp.buildVideoUrl`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.adServers.dfp.buildVideoUrl):
    + If Prebid Cache is enabled, Prebid does not set the `description_url` field to the bid response's `bid.vastUrl`. It just attaches the bid's ad server targeting and builds the URL based on user input.
    + If Prebid Cache is disabled, Prebid sets the `description_url` field to the bid response's `bid.vastUrl`.

### 4. Invoke video player on Prebid video URL

In the body of the page, the following HTML and JS will show the ad:

```html
<div class="example-video-container">
  <video id="vid1" class="video-js vjs-default-skin vjs-big-play-centered" controls
    data-setup='{}'
    width='640'
    height='480'>
    <source src="http://vjs.zencdn.net/v/oceans.mp4" type='video/mp4'/>
    <source src="http://vjs.zencdn.net/v/oceans.webm" type='video/webm'/>
    <source src="http://vjs.zencdn.net/v/oceans.ogv" type='video/ogg'/>
  </video>
</div>

<script>
  function invokeVideoPlayer(url) {
    videojs("vid1").ready(function() {
      this.vastClient({
        adTagUrl: url,
        playAdAlways: true,
        verbosity: 0,
        vpaidFlashLoaderPath: "https://github.com/MailOnline/videojs-vast-vpaid/blob/RELEASE/bin/VPAIDFlash.swf?raw=true",
        autoplay: true
      });
      this.muted(true);
      this.play();
    });
  }
</script>
```

If you have [set up your ad server line items and creatives correctly]({{site.baseurl}}/adops/setting-up-prebid-video-in-dfp.html), you should see an instream pre-roll video ad followed by the oceans video from the [video.js homepage](http://videojs.com/).

## Working Examples

**Note:** Prebid video is designed to work across devices and browsers. This demo has been developed and tested only for Chrome desktop, Firefox desktop, and Chrome Android; additional device/browser support is planned to be added at a later date.

Below, find links to end-to-end "working examples" integrating Prebid.js demand with various video players:

### Using client-side adapters

+ [video.js]({{site.github.url}}/examples/video/videojs-demo.html)
+ [JWPlayer]({{site.github.url}}/examples/video/jwPlayerPrebid.html)
+ [Brightcove]({{site.github.url}}/examples/video/bc-demo.html)
+ [Kaltura]({{site.github.url}}/examples/video/klt-demo.html)
+ [Ooyala]({{site.github.url}}/examples/video/ooyala-demo.html)

### Using Prebid Server Video

+ [JW Player]({{site.baseurl}}/examples/video/jwplayer-pbserver-demo.html)
+ [Kaltura]({{site.baseurl}}/examples/video/kaltura-pbserver-demo.html)
+ [VideoJS]({{site.baseurl}}/examples/video/videojs-pbserver-demo.html)
+ [Ooyala]({{site.baseurl}}/examples/video/ooyala-pbserver-demo.html)

### All examples in one place

+ [Prebid Video Examples]({{site.github.url}}/examples/video)

## Related Topics

+ [Setting up Prebid Video in DFP]({{site.baseurl}}/adops/setting-up-prebid-video-in-dfp.html)

</div>
