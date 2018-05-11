---
layout: page
title: Ad Unit Reference
description: Ad Unit Reference
top_nav_section: dev_docs
nav_section: reference
pid: 10
---

<div class="bs-docs-section" markdown="1">

# Ad Unit Reference
{:.no_toc}

The ad unit object is where you configure what kinds of ads you will show in a given ad slot on your page, including:

+ Allowed sizes
+ Allowed media types (e.g., banner, native, and/or video)

It's also where you will configure bidders, e.g.:

+ Which bidders are allowed to bid for that ad slot
+ What information is passed to those bidders via their [parameters]({{site.baseurl}}/dev-docs/bidders.html)

This page describes the properties of the `adUnit` object.

* TOC
{:toc}

## adUnit

See the table below for the list of properties on the ad unit.  For example ad units, see the [Examples](#adUnit-examples) below.

{: .table .table-bordered .table-striped }
| Name         | Scope    | Type                                  | Description                                                                                                                                                                                |
|--------------+----------+---------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `code`       | Required | String                                | Unique identifier you create and assign to this ad unit.  Used to set query string targeting on the ad. If using GPT, we recommend setting this to slot element ID.                        |
| `sizes`      | Required | Array[Number] or Array[Array[Number]] | All sizes this ad unit can accept.  Examples: `[400, 600]`, `[[300, 250], [300, 600]]`.  For 1.0 and later, define sizes within the appropriate `mediaTypes.{banner,native,video}` object. |
| `bids`       | Required | Array[Object]                         | Array of bid objects representing demand partners and associated parameters for a given ad unit.  See [Bids](#adUnit.bids) below.                                                          |
| `mediaTypes` | Optional | Object                                | Defines one or more media types that can serve into the ad unit.  For a list of properties, see [`adUnit.mediaTypes`](#adUnit.mediaTypes) below.                                           |
| `labelAny`   | Optional | Array[String]                         | Used for [conditional ads][conditionalAds].  Works with `sizeConfig` argument to [pbjs.setConfig][configureResponsive].                                                                    |
| `labelAll`   | Optional | Array[String]                         | Used for [conditional ads][conditionalAds]. Works with `sizeConfig` argument to [pbjs.setConfig][configureResponsive].                                                                     |

<a name="adUnit.bids" />

### adUnit.bids

See the table below for the list of properties in the `bids` array of the ad unit.  For example ad units, see the [Examples](#adUnit-examples) below.

{: .table .table-bordered .table-striped }
| Name       | Scope    | Type          | Description                                                                                                                              |
|------------+----------+---------------+------------------------------------------------------------------------------------------------------------------------------------------|
| `bidder`   | Required | String        | Unique code identifying the bidder. For bidder codes, see the [bidder param reference]({{site.baseurl}}/dev-docs/bidders.html).          |
| `params`   | Required | Object        | Bid request parameters for a given bidder. For allowed params, see the [bidder param reference]({{site.baseurl}}/dev-docs/bidders.html). |
| `labelAny` | Optional | Array[String] | Used for [conditional ads][conditionalAds].  Works with `sizeConfig` argument to [pbjs.setConfig][configureResponsive].                  |
| `labelAll` | Optional | Array[String] | Used for [conditional ads][conditionalAds]. Works with `sizeConfig` argument to [pbjs.setConfig][configureResponsive].                   |

<a name="adUnit.mediaTypes" />

### adUnit.mediaTypes

See the table below for the list of properties in the `mediaTypes` object of the ad unit.  For example ad units showing the different media types, see the [Examples](#adUnit-examples) below.

{: .table .table-bordered .table-striped }
| Name                                  | Scope                                                                    | Type   | Description                                                                                                      |
|---------------------------------------+--------------------------------------------------------------------------+--------+------------------------------------------------------------------------------------------------------------------|
| [`banner`](#adUnit.mediaTypes.banner) | At least one of the `banner`, `native`, or `video` objects are required. | Object | Defines properties of a banner ad.  For examples, see [`adUnit.mediaTypes.banner`](#adUnit.mediaTypes.banner).   |
| [`native`](#adUnit.mediaTypes.native) | At least one of the `banner`, `native`, or `video` objects are required. | Object | Defines properties of a native ad.  For properties, see [`adUnit.mediaTypes.native`](#adUnit.mediaTypes.native). |
| [`video`](#adUnit.mediaTypes.video)   | At least one of the `banner`, `native`, or `video` objects are required. | Object | Defines properties of a video ad.  For examples, see [`adUnit.mediaTypes.video`](#adUnit.mediaTypes.video).      |

<a name="adUnit.mediaTypes.banner" />

#### adUnit.mediaTypes.banner

{: .table .table-bordered .table-striped }
| Name    | Scope    | Type                                  | Description                                                                             |
|---------+----------+---------------------------------------+-----------------------------------------------------------------------------------------|
| `sizes` | Required | Array[Number] or Array[Array[Number]] | All sizes this ad unit can accept.  Examples: `[400, 600]`, `[[300, 250], [300, 600]]`. |
| `name`  | Optional | String                                | Name for this banner ad unit.  Can be used for testing and debugging.                   |

<a name="adUnit.mediaTypes.native" />

#### adUnit.mediaTypes.native

The `native` object contains the following properties that correspond to the assets of the native ad.

{: .table .table-bordered .table-striped }
| Name          | Scope    | Type   | Description                                                                                                                                                                                                          |
|---------------+----------+--------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`        | Optional | String | A [pre-defined native type]({{site.baseurl}}/dev-docs/show-native-ads.html#pre-defined-native-types) used as a shorthand, e.g., `type: 'image'` implies required fields `image`, `title`, `sponsoredBy`, `clickUrl`. |
| `title`       | Optional | Object | The title object is to be used for the title element of the native ad.  For properties, see [`native.title`](#adUnit.mediaTypes.native.title).                                                                       |
| `body`        | Optional | Object | The body object is to be used for the body element of the native ad.  For properties, see [`native.body`](#adUnit.mediaTypes.native.body).                                                                           |
| `sponsoredBy` | Optional | Object | The name of the brand associated with the ad.  For properties, see [`native.sponsoredBy`](#adUnit.mediaTypes.native.sponsoredby).                                                                                    |
| `icon`        | Optional | Object | The brand icon that will appear with the ad.  For properties, see [`native.icon`](#adUnit.mediaTypes.native.icon).                                                                                                   |
| `image`       | Optional | Object | The image object is to be used for the main image of the native ad.  For properties, see [`native.image`](#adUnit.mediaTypes.native.image).                                                                          |
| `clickUrl`    | Optional | Object | Where the user will end up if they click the ad.  For properties, see [`native.clickUrl`](#adUnit.mediaTypes.native.clickUrl).                                                                                       |
| `cta`         | Optional | Object | *Call to Action* text, e.g., "Click here for more information".  For properties, see [`native.cta`](#adUnit.mediaTypes.native.cta).                                                                                  |

<a name="adUnit.mediaTypes.native.image" />

##### adUnit.mediaTypes.native.image

{: .table .table-bordered .table-striped }
| Name            | Scope    | Type                                  | Description                                                                                                                                           |
|-----------------+----------+---------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `required`      | Optional | Boolean                               | Whether this asset is required.                                                                                                                       |
| `sizes`         | Optional | Array[Number] or Array[Array[Number]] | All sizes this ad unit can accept.  Examples: `[400, 600]`, `[[300, 250], [300, 600]]`.                                                               |
| `aspect_ratios` | Optional | Array[Object]                         | Alongside `sizes`, you can define allowed aspect ratios.  For properties, see [`image.aspect_ratios`](#adUnit.mediaTypes.native.image.aspect_ratios). |

<a name="adUnit.mediaTypes.native.image.aspect_ratios" />

###### adUnit.mediaTypes.native.image.aspect_ratios

{: .table .table-bordered .table-striped }
| Name           | Scope    | Type    | Description                                                                                          |
|----------------+----------+---------+------------------------------------------------------------------------------------------------------|
| `min_width`    | Optional | Integer | The minimum width required for an image to serve (in pixels).                                        |
| `ratio_height` | Required | Integer | This, combined with `ratio_width`, determines the required aspect ratio for an image that can serve. |
| `ratio_width`  | Required | Integer | See above.                                                                                           |

<a name="adUnit.mediaTypes.native.title" />

##### adUnit.mediaTypes.native.title

{: .table .table-bordered .table-striped }
| Name       | Scope    | Type    | Description                                          |
|------------+----------+---------+------------------------------------------------------|
| `required` | Optional | Boolean | Whether a title asset is required on this native ad. |
| `len`      | Optional | Integer | Maximum length of title text, in characters.         |

<a name="adUnit.mediaTypes.native.sponsoredBy" />

##### adUnit.mediaTypes.native.sponsoredBy

{: .table .table-bordered .table-striped }
| Name       | Scope    | Type    | Description                                               |
|------------+----------+---------+-----------------------------------------------------------|
| `required` | Optional | Boolean | Whether a brand name asset is required on this native ad. |

<a name="adUnit.mediaTypes.native.clickUrl" />

##### adUnit.mediaTypes.native.clickUrl

{: .table .table-bordered .table-striped }
| Name       | Scope    | Type    | Description                                              |
|------------+----------+---------+----------------------------------------------------------|
| `required` | Optional | Boolean | Whether a click URL asset is required on this native ad. |

<a name="adUnit.mediaTypes.native.body" />

##### adUnit.mediaTypes.native.body

{: .table .table-bordered .table-striped }
| Name       | Scope    | Type    | Description                                       |
|------------+----------+---------+---------------------------------------------------|
| `required` | Optional | Boolean | Whether body text is required for this native ad. |
| `len`      | Optional | Integer | Maximum length of body text, in characters.       |

<a name="adUnit.mediaTypes.native.icon" />

##### adUnit.mediaTypes.native.icon

{: .table .table-bordered .table-striped }
| Name            | Scope    | Type                                  | Description                                                                                                                                          |
|-----------------+----------+---------------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------|
| `required`      | Optional | Boolean                               | Whether an icon asset is required on this ad.                                                                                                        |
| `sizes`         | Optional | Array[Number] or Array[Array[Number]] | All sizes this ad unit can accept.  Examples: `[400, 600]`, `[[300, 250], [300, 600]]`.                                                              |
| `aspect_ratios` | Optional | Array[Object]                         | Instead of `sizes`, you can define allowed aspect ratios.  For properties, see [`icon.aspect_ratios`](#adUnit.mediaTypes.native.icon.aspect_ratios). |

<a name="adUnit.mediaTypes.native.icon.aspect_ratios" />

###### adUnit.mediaTypes.native.icon.aspect_ratios

{: .table .table-bordered .table-striped }
| Name           | Scope    | Type    | Description                                                                                          |
|----------------+----------+---------+------------------------------------------------------------------------------------------------------|
| `min_width`    | Optional | Integer | The minimum width required for an image to serve (in pixels).                                        |
| `ratio_height` | Required | Integer | This, combined with `ratio_width`, determines the required aspect ratio for an image that can serve. |
| `ratio_width`  | Required | Integer | See above.                                                                                           |

<a name="adUnit.mediaTypes.video" />

#### adUnit.mediaTypes.video

{: .table .table-bordered .table-striped }
| Name             | Scope       | Type                   | Description                                                                                                                                                         |
|------------------+-------------+------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `context`        | Optional    | String                 | The video context, either `'instream'` or `'outstream'`.  Example: `context: 'outstream'`                                                                           |
| `playerSize`     | Optional    | Array[Integer,Integer] | The size (width, height) of the video player on the page, in pixels.  Example: `playerSize: [640, 480]`                                                             |
| `mimes`          | Recommended | Array[String]          | Content MIME types supported, e.g., `"video/x-ms-wmv"`, `"video/mp4"`. **Required by OpenRTB when using [Prebid Server][pbServer]**.                                |
| `protocols`      | Optional    | Array[Integer]         | Array of supported video protocols.  For list, see [OpenRTB spec][openRTB]. **Required by OpenRTB when using [Prebid Server][pbServer]**.                           |
| `playbackmethod` | Optional    | Array[Integer]         | Allowed playback methods. If none specified, all are allowed.  For list, see [OpenRTB spec][openRTB]. **Required by OpenRTB when using [Prebid Server][pbServer]**. |

<a name="adUnit-examples" />

## Examples

+ [Banner](#adUnit-banner-example)
+ [Video](#adUnit-video-example)
+ [Native](#adUnit-native-example)
+ [Multi-Format](#adUnit-multi-format-example)

<a name="adUnit-banner-example">

### Banner

For an example of a banner ad unit, see below.  For more detailed instructions, see [Getting Started]({{site.baseurl}}/dev-docs/getting-started.html).

```javascript
pbjs.addAdUnits({
    code: slot.code,
    mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
    },
    bids: [
        {
            bidder: 'appnexus',
            params: {
                placementId: 13144370
            }
        }
    ]
});
```

<a name="adUnit-video-example">

### Video

For an example of an instream video ad unit, see below.  For more detailed instructions, see [Show Video Ads]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html).

```javascript
pbjs.addAdUnits({
    code: slot.code,
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [640, 480],
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
});
```

For an example of an outstream video ad unit, see below.  For more detailed instructions, see [Show Outstream Video Ads]({{site.baseurl}}/dev-docs/show-outstream-video-ads.html).

```javascript
pbjs.addAdUnits({
    code: slot.code,
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [640, 480]
        }
    },
    renderer: {
        url: 'http://cdn.adnxs.com/renderer/video/ANOutstreamVideo.js',
        render: function(bid) {
            ANOutstreamVideo.renderAd({
                targetId: bid.adUnitCode,
                adResponse: bid.adResponse,
            });
        }
    },
    ...
});
```

<a name="adUnit-native-example">

### Native

For an example of a native ad unit, see below.  For more detailed instructions, see [Show Native Ads]({{site.baseurl}}/dev-docs/show-native-ads.html).

```javascript
pbjs.addAdUnits({
    code: slot.code,
    mediaTypes: {
        native: {
            image: {
                required: true,
                sizes: [150, 50]
            },
            title: {
                required: true,
                len: 80
            },
            sponsoredBy: {
                required: true
            },
            clickUrl: {
                required: true
            },
            body: {
                required: true
            },
            icon: {
                required: true,
                sizes: [50, 50]
            }
        }
    },
    bids: [
        {
            bidder: 'appnexus',
            params: {
                placementId: 13232354
            }
        }
    ]
});
```

<a name="adUnit-multi-format-example">

### Multi-Format

For an example of a multi-format ad unit, see below.  For more detailed instructions, see [Show Multi-Format Ads]({{site.baseurl}}/dev-docs/show-multi-format-ads.html).

{% highlight js %}

pbjs.addAdUnits([{
        code: 'div-banner-native',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250]
                ]
            },
            native: {
                type: 'image'
            },
        },
        bids: [{
            bidder: 'appnexus',
            params: {
                placementId: 13232392,
            }
        }]
    },

    {
        code: 'div-banner-outstream',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250]
                ]
            },
            video: {
                context: 'outstream',
                playerSize: [300, 250]
            },
        },
        bids: [{
            bidder: 'appnexus',
            params: {
                placementId: 13232392,
            }
        }, ]
    },

    {
        code: 'div-banner-outstream-native',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250]
                ]
            },
            native: {
                type: 'image'
            },
            video: {
                context: 'outstream',
                playerSize: [300, 250]
            },
        },
        bids: [{
            bidder: 'appnexus',
            params: {
                placementId: 13232392,
            }
        }, ]
    }
]);

{% endhighlight %}

## Related Topics

+ [Publisher API Reference]({{site.baseurl}}/dev-docs/publisher-api-reference.html)
+ [Conditional Ad Units][conditionalAds]
+ [Show Native Ads]({{site.baseurl}}/dev-docs/show-native-ads.html)
+ [Show Video Ads]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html)
+ [Show Outstream Video Ads]({{site.baseurl}}/dev-docs/show-outstream-video-ads.html)
+ [Prebid.org Video Examples]({{site.baseurl}}/examples/video/)
+ [Prebid.org Native Examples]({{site.baseurl}}/examples/native/)

</div>

<!-- Reference Links -->

[conditionalAds]: {{site.baseurl}}/dev-docs/conditional-ad-units.html
[setConfig]: {{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.setConfig
[configureResponsive]: {{site.baseurl}}/dev-docs/publisher-api-reference.html#setConfig-Configure-Responsive-Ads
[openRTB]: https://www.iab.com/wp-content/uploads/2015/05/OpenRTB_API_Specification_Version_2_3_1.pdf
[pbServer]: {{site.baseurl}}/dev-docs/get-started-with-prebid-server.html
