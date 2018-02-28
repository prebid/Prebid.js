---
layout: page
title: Show Prebid Ads on AMP Pages
description: Show Prebid Ads using Prebid Server and AMP RTC
pid: 1
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-amp
---

<div class="bs-docs-section" markdown="1">

# Show Prebid Ads on AMP Pages
{: .no_toc}

This page has instructions for showing ads on AMP pages using Prebid.js.

At a high level, our implementation uses [Prebid Server][PBS] to talk to [AMP][AMPads] runtim using the [AMP Real Time Config (RTC)][RTC-Overview] protocol.

For more information about AMP RTC, see:

+ [How Prebid on AMP Works]({{site.baseurl}}/dev-docs/how-prebid-on-amp-works.html)
+ [AMP RTC Overview][RTC-Overview]
+ [AMP RTC Publisher Integration Guide](https://github.com/ampproject/amphtml/blob/master/extensions/amp-a4a/rtc-publisher-implementation-guide.md)

{: .alert.alert-success :}
For ad ops setup instructions, see [Setting up Prebid for AMP in DFP]({{site.github.url}}/adops/setting-up-prebid-for-amp-in-dfp.html).

* TOC
{:toc }

## Prerequisites

To set up Prebid to serve ads into your AMP pages, you'll need:

+ An account with a [Prebid Server][PBS] instance
+ One or more Prebid Server demand partner configurations. A configuration is essentially just a list of the demand partners that you want to work with, along with their respective parameters
+ An AMP page containing at least one amp-ad element for an AMP ad network that supports Fast Fetch and AMP RTC

## Implementation

+ [AMP content page](#amp-content-page): This is where your content lives.
+ [HTML Creative](#html-creative): This is the creative your Ad Ops team puts in your ad server.

### AMP content page

The `amp-ad` elements in the page body need to be set up as shown below, especially the following attributes:

+ `data-slot`: Identifies the ad slot for the auction.
+ `rtc-config`: Used to pass JSON configuration data to [Prebid Server][PBS], which will actually handle the communication with AMP RTC. The rtc_config.vendors property should define any vendors that will be receiving RTC callouts (including Prebid Server) up to a maximum of five

{% highlight html %}

    <amp-ad width="300" height="250"
            type="doubleclick"
            data-slot="/19968336/universal_creative"
            rtc-config='{"vendors": {"PrebidAppNexus": {"PLACEMENT_ID": "12345679"}}, "timeoutMillis": 500}'>
    </amp-ad>

{% endhighlight %}

### HTML Creative

This is the creative that your Ad Ops team needs to upload to the ad server (it's also documented at [Setting up Prebid for AMP in DFP]({{site.github.url}}/adops/setting-up-prebid-for-amp-in-dfp.html)).

{: .alert.alert-success :}
You can always get the latest version of the creative code below from [the AMP example creative file in our GitHub repo](https://github.com/prebid/prebid-universal-creative/blob/master/template/amp/dfp-creative.html).

{% highlight html %}

    <script src = "https://cdn.jsdelivr.net/npm/prebid-universal-creative@0.1.2/dist/creative.js"></script>
    <script>
    var adId = "%%PATTERN:hb_adid%%";
    var cacheHost = "%%PATTERN:hb_cache_host%%";
    var cachePath = "%%PATTERN:hb_cache_path%%";
    var uuid = "%%PATTERN:hb_cache_id%%";
    var mediaType = "%%PATTERN:hb_format%%";
    var pubUrl = "%%PATTERN:url%%";

    try {
        pbjs.renderAd(document, adId, {
            cacheHost: cacheHost,
            cachePath: cachePath,
            uuid: uuid,
            mediaType: mediaType,
            pubUrl: pubUrl
        });
    } catch (e) {
        console.log(e);
    }
    </script>

{% endhighlight %}

## Related Topics

+ [AMP RTC Overview][RTC-Overview]
+ [AMP RTC Publisher Integration Guide](https://github.com/ampproject/amphtml/blob/master/extensions/amp-a4a/rtc-publisher-implementation-guide.md)
+ [Setting up Prebid for AMP in DFP]({{site.github.url}}/adops/setting-up-prebid-for-amp-in-dfp.html) (Ad Ops Setup)

</div>

<!-- Reference Links -->

[PBS]: {{site.baseurl}}/dev-docs/get-started-with-prebid-server.html
[RTC-Overview]: https://github.com/ampproject/amphtml/blob/master/extensions/amp-a4a/rtc-documentation.md
[AMPads]: https://github.com/ampproject/amphtml/blob/master/ads/google/a4a/docs/a4a-readme.md
