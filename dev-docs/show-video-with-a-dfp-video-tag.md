---
layout: page
title: Show Video Ads with a DFP Video Tag
description: 
pid: 0
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-video
---

<div class="bs-docs-section" markdown="1">

# Show Video Ads with a DFP Video Tag (Beta)
{: .no_toc}

In this tutorial, we'll show how to set up Prebid to show a video ad
from DFP.  We'll use the [Video.js](http://videojs.com/) player and
the AppNexus AST bidder, but this should work similarly with other
video players.

Note that you'll need to make sure to work with video-enabled bidders
(In the file `adapters.json` in the Prebid.js repo, they will have
`"video"` in their list of supported media types).

* TOC
{:toc }

## Prerequisites

The code below was built with access to the following libraries:

+ video.js version 5.9.2
+ MailOnline videojs-vast-vpaid plugin version 2.0.2

## Implementation

This section will take you through the code you need to write to show
video ads using Prebid.js and Video.js.

At a high level, we'll:

+ create a video ad unit
+ add the video ad unit to our list of ad units
+ request bids
+ build a video tag from the DFP ad server tag
+ invoke the video player with the video tag you just built

Along the way we'll log a few things to the browser console to make sure
everything is working.

### 1. Create a video ad unit

First you need a video ad unit.  It should look something like this.
Don't forget to add your own valid placement ID.

```javascript
var videoAdUnit = {
  code: 'video',
  sizes: [640,480],
  mediaType: 'video',
  bids: [
    {
      bidder: 'appnexusAst',
      params: {
        placementId: '123456'  // <-- Replace this!
            video: {
              skippable: true
            }
      }
    }
  ]
};
```

### 2. Request bids, build a video tag, and invoke the player

Next, do the standard Prebid "add ad units and request bids" dance.
In the example below, we've added some code that is not strictly
necessary, but was helpful during development.  Specifically, we log:

+ the `bids` object we got back from our demand sources
+ a notice telling us whether there was video demand
+ the URL of the VAST creative, if any (this is also helpful if you
  don't necessarily use DFP)

To optimize setup for low latency, we recommend that this code (and that referenced above in step #1) be added to the page header.

```javascript
pbjs.que.push(function(){
  pbjs.addAdUnits(videoAdUnit);

  pbjs.requestBids({
    timeout : 700,
    bidsBackHandler : function(bids) {
      console.log('got bids back: ');
      console.log(bids);
      if (!bids.video) {
        console.log('no video demand');
      }
      else {
        console.log('we got video demand!');
      }

      // Log the VAST URL, if there is one
      try {
        url = bids.video.bids[0].vastUrl;
        console.log('VAST URL: ');
        console.log(url);
      } catch (e) {} // ignore

      // This is the example tag from https://support.google.com/dfp_premium/answer/1068325
      var adserverTag = 'http://pubads.g.doubleclick.net/gampad/ads?env=vp&gdfp_req=1&impl=s&output=vast&iu=/6062/video-demo&sz=400x300&unviewed_position_start=1&url=http://www.simplevideoad.com&ciu_szs=728x90,300x250&correlator=7105';

      var options = {
        'adserver': 'dfp',
        'code': 'video' // Must match the code from the `videoAdUnit` above
      };

      // Generate DFP Video Ad Server Tag URL
      var masterTagUrl = pbjs.buildMasterVideoTagFromAdserverTag(adserverTag, options);

      console.log('buildMasterVideoTagFromAdserverTag: ' + masterTagUrl);

      // Send masterTagUrl to the video player
      invokeVideoPlayer(masterTagUrl);
    }
  });
});
```

### 3. Add the video player code to the page body

In the body of the page, some HTML and JS like the following will show
the ad -- this is where `invokeVideoPlayer` is defined:

```html
<div class="example-video-container">
  <video id="vid1" class="video-js vjs-default-skin vjs-big-play-centered" controls 
    data-setup='{}'
    width='640'
    height='480'
  >
    <source src="http://vjs.zencdn.net/v/oceans.mp4" type='video/mp4'/>
    <source src="http://vjs.zencdn.net/v/oceans.webm" type='video/webm'/>
    <source src="http://vjs.zencdn.net/v/oceans.ogv" type='video/ogg'/>    
  </video>
</div>

<script>

var vid1 = videojs('vid1');

function invokeVideoPlayer(url) {
  videojs("vid1").ready(function() {
    var player = this;
    var vastAd = player.vastClient({
      adTagUrl: url,
      playAdAlways: true,
      vpaidFlashLoaderPath: "https://github.com/MailOnline/videojs-vast-vpaid/blob/RELEASE/bin/VPAIDFlash.swf?raw=true",
      autoplay: true
    });
    player.muted(true);
    player.play();
  });
}

</script>
```

If you have [set up your adserver line items/ creatives]({{site.github.url}}/adops/setting-up-prebid-video-in-dfp.html) correctly, you should see
an instream preroll video ad followed by the oceans video from the [video.js homepage](http://videojs.com/).

## Working Examples

**Note:** Prebid video is designed to work across devices and browsers. This demo has been developed and tested only for Chrome desktop, Firefox desktop, and Chrome Android; additional device/browser support is planned to be added at a later date.

Below, find links to end-to-end "working examples" integrating Prebid.js demand with various video players:

+ [video.js](http://video-demo.appnexus.com/pbjs/mjacobson/video_testing/prebid_video_videojs_new.html)
+ [JWPlayer](http://video-demo.appnexus.com/pbjs/JWPlayerDemo/jwPlayerPrebid.html)

</div>
