---
layout: page
title: Show Multi-Format Ads with Prebid.js
description: Show Multi-Format Ads with Prebid.js
pid: 0
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-multi-format
---

<div class="bs-docs-section" markdown="1">

# Show Multi-Format Ads with Prebid.js
{: .no_toc }

This page has instructions for showing multi-format ads using Prebid.js.

An ad unit is said to be multi-format if it supports at least two of the following media types:

+ Banner
+ Native
+ Video

Once declared, any bidder that supports at least one of the media types can participate in the auction for that ad unit.

{: .alert.alert-info :}
For ad ops setup instructions, see [Setting up Prebid Multi-Format in DFP]({{site.baseurl}}/adops/setting-up-prebid-multi-format-in-dfp.html).

* TOC
{:toc}

## How Multi-Format Ads Work

Prebid multi-format ad units allow direct competition between banner, native, and/or video bids.

At a high level, Prebid.js supports multi-format ads as follows:

1. An ad unit may define a [`mediaTypes`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#addAdUnits-MediaTypes) object to specify one or more supported formats and their respective properties.
2. Each bidder specified on a given ad unit will be eligible to bid if the bidder supports at least one of the media types specified via `adUnit.mediaTypes`.
3. Prebid.js sends bid requests to each eligible bidder.

The following key is added to your ad server targeting, and set to the value of the bid response's `mediaType` property.

+ `hb_format`

The ad ops team will reference this key in the ad server to set targeting.  For ad ops setup instructions, see [Setting up Prebid Multi-Format in DFP]({{site.baseurl}}/adops/setting-up-prebid-multi-format-in-dfp.html).

## Prerequisites

Keep the following prerequisites in mind during the implementation:

+ Make sure to work with bidders that support demand for the media types you want, particularly native and video.  To see which bidders have native and/or video demand, see [Bidders with Video and Native Demand]({{site.baseurl}}/dev-docs/bidders.html#bidders-with-video-and-native-demand).

## Implementation

This section describes the implementation using code samples, but ignores some of the details that are common to all Prebid.js setups.

### 1. Add multi-format ad units

The ad unit below supports the banner, native, and video media types.

```javascript

    pbjs.addAdUnits({
        code: 'div-banner-outstream-native',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250],
                    [300, 50]
                ]
            },
            native: {
                image: {
                    sizes: [
                        [300, 250],
                        [300, 50]
                    ]
                }
            },
            video: {
                context: 'outstream',
                playerSize: [640, 480]
            },
        },
        bids: [

            {
                bidder: 'bannerBidder',
                params: {
                    placementId: '481'
                }
            },

            {
                bidder: 'nativeBidder',
                params: {
                    titleAsset: '516'
                }
            },

            {
                bidder: 'videoBidder',
                params: {
                    vidId: '234'
                }
            },

        ]
    });
```

### 2. Add your tag to the page body

Add a tag like the following to your page.  Depending on who wins the auction, a banner, outstream, or native ad should serve.

```html
    <div id='div-banner-outstream-native'>
        <p>No response</p>
        <script type='text/javascript'>
            googletag.cmd.push(function () {
                googletag.display('div-banner-outstream-native');
            });
        </script>
    </div>
```

## Working Examples

+ [Multi-Format Example]({{site.baseurl}}/examples/multi_format_example.html)

## Related Topics

+ [Setting up Prebid Multi-Format in DFP]({{site.baseurl}}/adops/setting-up-prebid-multi-format-in-dfp.html)

</div>
