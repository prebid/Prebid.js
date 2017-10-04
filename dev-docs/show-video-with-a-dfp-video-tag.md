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
the AppNexus AST bidder, but the principles are the same across
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

For example, to build with the AppNexus AST bidder adapter and the DFP
Video ad server adapter, use the following command:

```bash
gulp build --modules=dfpAdServerVideo,appnexusAstBidAdapter
```

For more information about how to build with modules, see the [Prebid.js project README](https://github.com/prebid/Prebid.js/blob/master/README.md#build-optimization).

Finally, your ad ops team needs to have set up line items in DFP
following the instructions at
[Setting up Prebid Video in DFP]({{site.baseurl}}/setting-up-prebid-video-in-dfp.html).

## Implementation

This section will take you through the code you need to write to show
video ads using Prebid.js and Video.js.

### 1. Create a video ad unit

First you need a video ad unit.  It should look something like this.
Don't forget to add your own valid placement ID.

```javascript
var videoAdUnit = {
    code: 'video',
    sizes: [640, 480],
    mediaTypes: {
        video: {
            context: "instream"
        },
    },
    bids: [{
        bidder: 'appnexusAst',
        params: {
            placementId: '9333431',
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

For instructions, see [Custom Price Bucket with `setPriceGranularity`]({{site.baseurl}}/dev-docs/examples/custom-price-bucket-using-setpricegranularity.html).

### 3. Request bids, build video URL

Next, we need to do the standard Prebid "add ad units and request bids" dance.

In the example below, our callback builds the video URL the player needs using the `buildVideoUrl` method from the DFP ad server module that we built into our copy of Prebid.js in the **Prerequisites** section.

For more information, see the API documentation for [pbjs.adServers.dfp.buildVideoUrl]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.adServers.dfp.buildVideoUrl).  Understanding the arguments to this method is *especially* important if you plan to pass any custom parameters to DFP.  The `params` key in the argument to `buildVideoUrl` supports all parameters from the [DFP API](https://support.google.com/dfp_premium/answer/1068325?hl=en).

{: .alert.alert-warning :}
**Prebid Cache must be enabled**  
You must enable Prebid Cache as shown below in order for the DFP Ad Server Video module's call to `buildVideoUrl` to work.

```javascript
pbjs.que.push(function() {
    pbjs.addAdUnits(videoAdUnit);

    /* Required for the DFP video URL to be built correctly in the
    `bidsBackHandler` */
    pbjs.setConfig({
        usePrebidCache: true
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

+ [video.js]({{site.github.url}}/examples/video/videojs-demo.html)
+ [JWPlayer]({{site.github.url}}/examples/video/jwPlayerPrebid.html)
+ [Brightcove]({{site.github.url}}/examples/video/bc-demo.html)
+ [Kaltura]({{site.github.url}}/examples/video/klt-demo.html)
+ [Ooyala]({{site.github.url}}/examples/video/ooyala-demo.html)

## Related Topics

+ [Setting up Prebid Video in DFP]({{site.baseurl}}/adops/setting-up-prebid-video-in-dfp.html)

</div>
