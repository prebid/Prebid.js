---
layout: post
title: Prebid.js Releases Outstream Video Support
head_title: Prebid.js Releases Outstream Video Support
description: Late last year, Prebid.js took an important first step beyond traditional display advertising formats with a release of formal support for instream video.  Today, Prebid.js is doubling down on its focus on formats with the release of outstream video support.
permalink: /blog/first-open-header-bidding-solution-for-video-now-available-on-prebid-js
---

(*This post first appeared on the [AppNexus Product Blog](http://productblog.appnexus.com/prebid-js-releases-outstream-video-support/).*)

Late last year, Prebid.js took an important first step beyond traditional display advertising formats with a release of formal [support for instream video](http://productblog.appnexus.com/first-open-header-bidding-solution-for-video-now-available-on-prebid-js/). Today, Prebid.js is doubling down on its focus on formats with the release of outstream video support.

{: .pb-md-img :}
![Outstream Prebid]({{ site.github.url }}/assets/images/blog/outstream-prebid.png)

Given the high cost of creating true instream video inventory and the inherent constraints that this places on supply, outstream video formats are proving extremely valuable for publishers looking for video monetization alternatives, and for marketers looking for more available video supply.

### How Does Prebid Outstream Work?

For those already familiar with the workflows for "traditional" Prebid display, getting started with outstream video through Prebid.js is very simple!

#### In the Ad Server

Within the ad server, you will need one or more display adUnits mapped to the intended size(s) of your outstream placement(s), or you can assign these adUnits a custom outstream size like ```1x1```. From there, you just need to configure Prebid line items in the same way that you would for display. The key / value targeting and creative setup will be identical!

#### On the Page

Making sure to update Prebid.js to its latest release version, the on-page setup requires only a few steps:

1. Add one or more adUnits to your page with the new ```video-outstream``` media type
2. Include at least one bidder on these adUnits capable of ingesting outstream video bid requests
3. Invoke your ad server for the outstream adUnit from the body of the page in the same way that you would for a display adUnit


```javascript
var outstreamVideoAdUnit = [
  {
    code: 'video-1',
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
```

#### Renderers

With its brand new support for "renderers", Prebid.js is able to traffic outstream video through display placements. In general, a renderer is the client-side code (usually a combination of JavaScript, HTML and CSS) responsible for displaying a creative on a page. Fundamentally, a renderer for outstream ads must provide a player environment capable of playing a video creative (most commonly, a VAST XML document). However, in practice, most outstream renderers provide additional functionality / logic, including, but not limited to:

* Volume, pause, and play controls for the user
* Ability to expand the player to fullscreen
* Skippability controls
* Vendor-specific text, color schemes or logos
* Expanding the video player when the user scrolls into view
* Contracting the player on video completion, or when the user scrolls out of view

Renderers, though, are not specific to outstream video ads. In fact, all creatives must have a renderer. The properties and required functionality of these renderers differ depending on the type of content being displayed. For example, native content (which is usually defined as a JSON structure containing a collection of assets) requires a renderer capable of assembling the included assets into the ad displayed on the page.

Today, for outstream video impressions, Prebid requires that each participating demand partner [return its own renderer on the bid response](https://github.com/prebid/Prebid.js/pull/1082). In general, however, it should not really matter where the renderer comes from, as long as at least one is specified. In the following section, we will discuss upcoming plans to expand the possible set of renderer sources and Prebid.js renderer selection logic.

### What's Next for Prebid Outstream?

In upcoming Prebid.js releases, we will be continuing to iterate on top of this initial outstream support to ensure that it satisfies the needs of the broadest possible set of publishers and demand partners. As such, we are focusing on a few key topics.

#### Running Outstream Without an Ad Server

Prebid.js has always been ad server agnostic, and so we do not believe that publishers looking to create and monetize outstream inventory should be tied to third-party publisher ad servers if they choose not to be. Publishers will be able to choose to give Prebid.js the ultimate responsibility for rendering outstream placements, thus removing the reliance on an ad server to monetize outstream video inventory.

#### Renderer Selection Logic

To ensure that publishers can take advantage of outstream video with every demand partner, we are expanding the logic by which Prebid.js will select the appropriate renderer to invoke for a given outstream video adUnit. As a result, demand partners will be able to participate on Prebid outstream video impressions even if they do not have their own outstream renderer. In order of priority, Prebid.js will choose a renderer on a given adUnit in the following way:

1. If the publisher specifies a renderer, Prebid.js will invoke it across all demand partners
2. If a demand partner specifies a renderer, Prebid.js will invoke it if and only if that demand partner serves
3. If neither the publisher nor the demand partner specify a renderer, Prebid.js will invoke its own open-source default renderer

#### Combining the Power of Both Instream and Outstream

We will consolidate instream and outstream video impressions under a common video adUnit definition, and add support for format-specific targeting parameters that demand partners will be able to ingest. As a result, instream and outstream video supply will have access to the same set of video-capable demand partners by default.

Supporting documentation specific to Prebid outstream video is available through prebid.org, including [How to Show Outstream Video Ads]({{ site.github.url }}/dev-docs/show-outstream-video-ads.html) and an [outstream end-to-end working example page](http://acdn.adnxs.com/prebid/alpha/unrulydemo.html).  
