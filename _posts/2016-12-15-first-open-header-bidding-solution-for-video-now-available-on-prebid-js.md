---
layout: post
title: First Open Header Bidding Solution for Video Now Available on Prebid.js
head_title: First Open Header Bidding Solution for Video Now Available on Prebid.js
description: A walkthrough of why header bidding implementations cause latency. An overview of how to use prebid.js to reduce it.
permalink: /blog/first-open-header-bidding-solution-for-video-now-available-on-prebid-js
---

(*This post first appeared on the [AppNexus Product Blog](http://productblog.appnexus.com/first-open-header-bidding-solution-for-video-now-available-on-prebid-js/).*)

At its core, Prebid.js has always worked towards achieving a few simple goals: providing publishers with fair and transparent access to demand; improving monetization by unlocking the true value of publisher inventory; and, asserting control over the (often narrow and unfavorable) auction dynamics kept locked by closed publisher adservers. 

The release of PreBid Video marks an important step forward for the open-source project, as market participants can begin to realize these same benefits across inventory formats beyond those of traditional display.

In a supply-constrained video ecosystem in which the majority of inventory is monetized via direct sales, PreBid Video offers a programmatic avenue through which publishers can achieve incremental value while still maintaining these guaranteed and/or direct buys.

{: .pb-md-img :}
![PreBid Video Evian]({{ site.github.url }}/assets/images/blog/PreBid-Evian.png)

The true value of an open-sourced project is realized through the ability to incorporate new functionalities, feature development, and bug fixes from a wide contributor network which encompasses diverse expertise and an array of market positions. We encourage and welcome these contributions as we look ahead towards iterative improvement on PreBid Video. With help from the community, we expect to be able to build portfolios of video-capable adapters to match the nearly 40 demand partners integrated today with PreBid display; of video player and adserver integrations with Prebid.js; and, of video-specific formats.

This paradigm has already netted tangible positive results among the several publishers with whom AppNexus has been working closely to enable PreBid Video on live traffic. 

One alpha partner who had already been monetizing display traffic through Prebid.js was able to expand upon the open-source code to integrate PreBid Video directly with hundreds of publishers using their proprietary video player and adserver stack. While Prebid.js currently offers built-in support for Google's DoubleClick for Publishers' Video Adserver, this partner was able to seamlessly incorporate PreBid Video demand into their existing Prebid.js implementation and their own adserver with only a few extra lines of code. Shortly after implementation, PreBid Video was providing real-time demand from some of the largest advertisers in the U.S. at CPMs ranging from $15 to $30, helping to realize strong incremental revenue lifts without adding page latency or compromising user experience.

```javascript
var videoAdUnit = {
  code: 'video',
  sizes: [640,480],
  mediaType: 'video',
  bids: [
    {
      bidder: 'appnexusAst',
      params: {
        placementId: '123456' // <-- Replace this!
        video: {
          skippable: true
        }
      }
    }
  ]
};
```

PreBid Video is and will continue to be adserver, video player, and demand partner agnostic, and is designed to work seamlessly with existing Prebid.js implementations. The Prebid.js source code is now [available in beta on GitHub](https://github.com/prebid/Prebid.js).

Supporting documentation is available through [Prebid.org](http://prebid.org), including:

+ [Setting up PreBid Video in Google's DoubleClick for Publishers' Video Adserver]({{ site.github.url }}/adops/setting-up-prebid-video-in-dfp.html)

+ [How to add a (Video) Bidder]({{ site.github.url }}/dev-docs/bidder-adaptor.html) 

+ End-to-end examples integrating Prebid.js demand with popular video player technologies, including: 

  + [video.js](http://video-demo.appnexus.com/pbjs/mjacobson/video_testing/prebid_video_videojs_new.html)
  + [JW Player](http://video-demo.appnexus.com/pbjs/JWPlayerDemo/jwPlayerPrebid.html)
  + [Brightcove](http://video-demo.appnexus.com/pbjs/brightcove-prebid/bc-demo.html)
  + [Kaltura](http://video-demo.appnexus.com/pbjs/kaltura-prebid/klt-demo.html)
  + [Ooyala](http://video-demo.appnexus.com/pbjs/ooyala-prebid/ooyala-demo.html)
