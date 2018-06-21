---
layout: bidder
title: AppNexus
description: Prebid AppNexus Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: appnexus
biddercode_longer_than_12: false
hide: true
prebid_1_0_supported : true
media_types: video, native
gdpr_supported: true
---

**Table of Contents**

- [Bid params](#appnexus-bid-params)
- [Support for publisher-defined keys](#appnexus-pub-keys)
- [Banner Ads](#appnexus-Banner)
- [Video Ads](#appnexus-Video)
- [Native Ads](#appnexus-Native)
+ [Multi-Format Ads](#appnexus-Multi-Format)

<a name="appnexus-bid-params" />

### Bid params

{: .table .table-bordered .table-striped }
| Name             | Scope    | Description                                                                                                                                                                                                          | Example           |
|------------------+----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------|
| `placementId`    | required | The placement ID from AppNexus.  You may identify a placement using the `invCode` and `member` instead of a placement ID.                                                                                            | `"234234"`        |
| `"arbitraryKey"` | optional | This key can be *any publisher-defined string*. The value (also a string) maps to a querystring segment for enhanced buy-side targeting. Multiple key-value pairs can be added as shown [below](#appnexus-pub-keys). | `'genre': 'rock'` |
| `invCode`        | optional | The inventory code from AppNexus. Must be used with `member`.                                                                                                                                                        | `"abc123"`        |
| `member`         | optional | The member ID  from AppNexus. Must be used with `invCode`.                                                                                                                                                           | `"12345"`         |
| `reserve`        | optional | Sets a floor price for the bid that is returned.                                                                                                                                                                     | `0.90`            |

<a name="appnexus-pub-keys" />

#### Support for publisher-defined keys

To pass in a publisher-defined key whose value maps to a querystring segment for buy-side targeting, set up your `params` object as shown below.  For more information, see the [query string targeting documentation](https://wiki.appnexus.com/x/7oCzAQ) (login required).

{% highlight js %}
var adUnits = [{
    code: 'div-gpt-ad-1460505748511-01',
    sizes: [
        [300, 250],
        [300, 50]
    ],
    bids: [{
        bidder: 'appnexus',
        params: {
            placementId: '123456789',
            'playlist': '12345', // <----| Publisher-defined key-values
            'genre': 'rock'      // <----| (key and value must be strings)
        }
    }]
}]
{% endhighlight %}

{: .alert.alert-info :}
Sizes set in the `adUnit` object will also apply to the AppNexus bid requests.

<a name="appnexus-Banner" />

#### Banner Ads

AppNexus supports the banner features described in:

- [The `adUnit` banner documentation]({{site.baseurl}}/dev-docs/adunit-reference.html#adUnit-banner-example)
- [Getting Started for Developers]({{site.baseurl}}/dev-docs/getting-started.html)

<a name="appnexus-Video" />

#### Video Ads

AppNexus supports the video features described in:

- [The `adUnit` video documentation]({{site.baseurl}}/dev-docs/adunit-reference.html#adUnit-video-example)
- [Show Video Ads]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html)
- [Show Outstream Video Ads]({{site.baseurl}}/dev-docs/show-outstream-video-ads.html)

<a name="appnexus-Native" />

#### Native Ads

AppNexus supports the native features described in:

- [The `adUnit` native documentation]({{site.baseurl}}/dev-docs/adunit-reference.html#adUnit-native-example)
- [Show Native Ads]({{site.baseurl}}/dev-docs/show-native-ads.html)

<a name="appnexus-Multi-Format" />

### Multi-Format

AppNexus supports the multi-format ad unit features described in:

- [The `adUnit` multi-format documentation]({{site.baseurl}}/dev-docs/adunit-reference.html#adUnit-multi-format-example)
- [Show Multi-Format Ads]({{site.baseurl}}/dev-docs/show-multi-format-ads.html)
