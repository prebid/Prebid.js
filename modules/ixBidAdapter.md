Overview
========

```
Module Name: Index Exchange Adapter
Module Type: Bidder Adapter
Maintainer: prebid.support@indexexchange.com
```

Description
===========

This module connects publishers to Index Exchange's (IX) network of demand
sources through Prebid.js. This module is GDPR and CCPA compliant.

It is compatible with the newer PrebidJS 5.0 ad unit format where the `banner`, `video` and/or `native` properties are encapsulated within the `adUnits[].mediaTypes` object. We
recommend that you use this newer format when possible as it will be better able
to accommodate new feature additions.


##### Newer Format
```javascript
var adUnits = [{
    // ...
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250],
                [300, 600]
            ]
        },
        video: {
            context: 'instream',
            playerSize: [300, 250]
        },
        native: {
            title: {
                required: true
            },
            image: {
                required: true
            },
            body: {
                required: false
            }
        },
    },
    // ...
}];
```

### Supported Media Types

| Type | Support
| --- | ---
| Banner | Fully supported for all IX approved sizes.
| Video  | Fully supported for all IX approved sizes.
| Native | Supported (render through GAM or publisher's renderer).



# Ad unit or Bidder Parameters

These params can be specified in the ad unit level `adUnits[].mediaTypes`, which will be the preferred way going forward with PBJS 5.0

Each of the IX-specific parameters provided under the `adUnits[].bids[].params`
object are detailed here.


## Banner

| Key | Scope | Type | Description
| --- | --- | --- | ---
| siteId | Required | String | An IX-specific identifier that is associated with this ad unit. It will be associated to the single size, if the size provided. This is similar to a placement ID or an ad unit ID that some other modules have. Examples: `'3723'`, `'6482'`, `'3639'`
| sizes | Required | Number[Number[]] | The size / sizes associated with the site ID. It should be one of the sizes listed in the ad unit under `adUnits[].mediaTypes.banner.sizes`. Examples: `[300, 250]`, `[300, 600]`, `[728, 90]`

## Video

| Key | Scope | Type | Description
| --- | --- | --- | ---
| siteId | Required | String | An IX-specific identifier that is associated with this ad unit. It will be associated to the single size, if the size is provided. This is similar to a placement ID or an ad unit ID that some other modules have. Examples: `'3723'`, `'6482'`, `'3639'`
| size | Optional (Deprecated)| Number[] | The single size associated with the site ID. It should be one of the sizes listed in the ad unit under `adUnits[].sizes` or `adUnits[].mediaTypes.video.playerSize`. Examples: `[300, 250]`, `[300, 600]`
| video | Optional | Hash | The video object will serve as the properties of the video ad. You can create any field under the video object that is mentioned in the `OpenRTB Spec v2.5`. Some fields like `mimes, protocols, minduration, maxduration` are required. Properties not defined at this level, will be pulled from the Adunit level.
|video.w| Required | Integer | The width of the video player in pixels that will be passed to demand partners.<br /> *If you are using Index’s outstream player and have placed the `video` object at the `bidder` level, this is a required field. You must define the size of the video player using the `video.w` and `video.h` parameters, with a minimum video player size of 300 x 250.
|video.h| Required | Integer | The height of the video player in pixels that will be passed to demand partners. <br />*If you are using Index’s outstream player and have placed the `video` object at the `bidder` level, this is a required field. You must define the size of the video player using the `video.w` and `video.h` parameters, with a minimum video player size of 300 x 250.
|video.playerSize| Optional* | Array[Integer,Integer] | The video player size that will be passed to demand partners.</br /> *If you are using Index’s outstream player and have placed the `video` object at the `adUnit` level, this is a required field. You must define the size of the video player using this parameter, with a minimum video player size of 300 x 250.
| video.mimes | Required | String[] | If you are using Index’s outstream video player and want to learn more about what is supported, see [List of supported OpenRTB bid request fields for Sellers](https://kb.indexexchange.com/publishers/openrtb_integration/list_of_supported_openrtb_bid_request_fields_for_sellers.htm#Video).
|video.minduration| Required | Integer | Minimum video ad duration in seconds.
|video.maxduration| Required | Integer | Maximum video ad duration in seconds.
|video.protocol / video.protocols| Required | Integer / Integer[] | Either a single protocol provided as an integer, or protocols provided as a list of integers. `2` - VAST 2.0, `3` - VAST 3.0, `5` - VAST 2.0 Wrapper, `6` - VAST 3.0 Wrapper
| video.playerConfig | Optional | Hash | The Index specific outstream player configurations.
| video.playerConfig.floatOnScroll | Optional | Boolean | A boolean specifying whether you want to use the player’s floating capabilities, where: <br /> - `true`: Allow the player to float.<br /> <b>Note</b>: If you set floatOnScroll to true, Index updates the placement value to `5`. <br />- `false`: Do not allow the player to float (default).
| video.playerConfig.floatSize | Optional | Integer[] | The height and width of the floating player in pixels. If you do not specify a float size, the player adjusts to the aspect ratio of the player size that is defined when it is not floating. Index recommends that you review and test the float size to your user experience preference.

## Native

| Key | Scope | Type | Description
| --- | --- | --- | ---
| sendTargetingKeys | Optional | Boolean | Defines whether or not to send the hb_native_ASSET targeting keys to the ad server. Defaults to true.
| adTemplate | Optional | String | Used in the ‘AdUnit-Defined Creative Scenario’, this value controls the Native template right in the page.
| rendererUrl | Optional | String | Used in the ‘Custom Renderer Scenario’, this points to javascript code that will produce the Native template.
| title | Optional | Title asset | The title of the ad, usually a call to action or a brand name.
| body | Optional | Data asset | Text of the ad copy.
| body2 | Optional | Data asset | Additional Text of the ad copy.
| sponsoredBy | Optional | Data asset | The name of the brand associated with the ad.
| icon | Optional | Image asset | The brand icon that will appear with the ad.
| image | Optional | Image asset | A picture that is associated with the brand, or grabs the user’s attention.
| displayUrl | Optional | Data asset | Text that can be displayed instead of the raw click URL. e.g, “Example.com/Specials”
| cta | Optional | Data asset | Call to Action text, e.g., “Click here for more information”.
| rating | Optional | Data asset | Rating information, e.g., “4” out of 5.
| downloads | Optional | Data asset | 	The total downloads of the advertised application/product.
| likes | Optional | Data asset | The total number of individuals who like the advertised application/product.
| price | Optional | Data asset | The non-sale price of the advertised application/product.
| salePrice | Optional | Data asset | The sale price of the advertised application/product.
| address | Optional | Data asset | 	Address of the Buyer/Store. e.g, “123 Main Street, Anywhere USA”
| phone | Optional | Data asset | Phone Number of the Buyer/Store. e.g, “(123) 456-7890”

#### Title Asset

| Key | Scope | Type | Description
| --- | --- | --- | ---
| required | Required | Boolean | Specify whether or not a title is required.
| len | Optional | Integer | Maximum number of characters (defaults to 25 if omitted).
| ext | Optional | Object | Arbitrary additional parameters to send to the bidder.

#### Data Asset

| Key | Scope | Type | Description
| --- | --- | --- | ---
| required | Required | Boolean | Specify whether or not the asset is required.
| len | Optional | Integer | Maximum number of characters.
| ext | Optional | Object | Arbitrary additional parameters to send to the bidder.

#### Image Asset

| Key | Scope | Type | Description
| --- | --- | --- | ---
| required | Required | Boolean | Specify whether or not the asset is required.
| sizes | Optional | Integer[] | Minimum size requested for the image, e.g., [100, 100]
| mimes | Optional | String[] | Whitelist of content MIME types supported, e.g., ["image/jpg", "image/gif"]
| ext | Optional | Object | Arbitrary additional parameters to send to the bidder.

### Rendering Native Ad

Native ad can be rendered by setting up GAM or setup custom native renderer. Reference [Prebid implementing the native template](https://docs.prebid.org/prebid/native-implementation.html#4-implementing-the-native-template) for more information.

## Deprecation warning

We are deprecating the older format
of having `mediaType` and `sizes` at the ad unit level.

Here are examples of the format.

##### Older Deprecated Format
```javascript
var adUnits = [{
    // ...

    sizes: [
        [300, 250],
        [300, 600]
    ]

    // ...
}];
```


Setup Guide
===========

Follow these steps to configure and add the IX module to your Prebid.js
integration.

Both video and banner params will be read from the `adUnits[].mediaTypes.video` and `adUnits[].mediaTypes.banner` respectively.

The examples in this guide assume the following starting configuration (you may remove banner or video, if either does not apply).


In regards to video, `context` can either be `'instream'` or `'outstream'`.

```javascript
var adUnits = [{
    code: 'banner-div-a',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250],
                [300, 600]
            ]
        }
    },
    bids: []
},
{
    code: 'video-div-a',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [
                [300, 250],
                [300, 600]
            ]
        }
    },
    bids: []
}];
```

### 1. Add IX to the appropriate ad units

For each ad unit that IX will be bidding on, add one of the following
bid objects under `adUnits[].bids`:
- size is optional and deprecated

```javascript
{
    bidder: 'ix',
    params: {
        siteId: '',
        size: [] // deprecated
    }
}
```

Set `params.siteId` in the bid object to the values provided
by your IX representative.
- `params.size` is not required anymore

**Examples**

**Banner:**
```javascript
var adUnits = [{
    code: 'banner-div-a',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250],
                [300, 600]
            ]
        }
    },
    bids: [{
        bidder: 'ix',
        params: {
            siteId: '12345'
        }
    }]
}];
```
**Video (Instream):**
```javascript
var adUnits = [{
    code: 'video-div-a',
    mediaTypes: {
        video: {
            // Preferred location for openrtb v2.5 compatible video obj
            context: 'instream',
            playerSize: [300, 250],
            mimes: [
                'video/mp4',
                'video/webm'
            ],
            minduration: 0,
            maxduration: 60,
            protocols: [6]
        }
    },
    bids: [{
        bidder: 'ix',
        params: {
            siteId: '12345'
        }
    }, {
        bidder: 'ix',
        params: {
            siteId: '12345',
            video: {
                // openrtb v2.5 compatible video obj
                // If required, use this to override mediaTypes.video.XX properties
            }
        }
    }]
}];
```
Please note that you can re-use the existing `siteId` within the same flex
position.

**Video (Outstream):**

Publishers have two options to receive outstream video demand from Index:
* Using Index’s outstream video player
* In an outstream video configuration set up by the publisher. For more information, see [Prebid’s documentation on how to show video ads.](https://docs.prebid.org/dev-docs/show-outstream-video-ads.html)

**Index’s outstream video player**
Publishers who are using Index as a bidding adapter in Prebid.js can show outstream video ads on their site from us by using Index’s outstream video player. This allows a video ad to display inside of a video player and can be placed anywhere on a publisher’s site, such as in-article, in-feed, and more.

Define a new `video` object for our outstream video player at either the adUnit level or the `bidder` level. If you are setting it at the bidder level, define the size of the video player using the parameters `video.h` and `video.w`. If you are setting it at the `adUnit` level, define the size using video.playerSize.

For more information on how to structure the `video` object, refer to the following code example:


```javascript
var adUnits = [{
    code: 'div-gpt-ad-1571167646410-1',
    mediaTypes: {
        video: {
            playerSize: [640, 360],
            context: 'outstream',
            api: [2],
            protocols: [2, 3, 5, 6],
            minduration: 5,
            maxduration: 30,
            mimes: ['video/mp4', 'application/javascript'],
            placement: 5
        }
    },
    bids: [{
        bidder: 'ix',
        params: {
            siteId: '715964'
            video: {
                playerConfig: {
                    floatOnScroll: true,
                    floatSize: [300,250]
                }
            }
        }
    }]
}];
```
<em>Please note that your use of the outstream video player will be governed by and subject to the terms and conditions of i) any master services or license agreement entered into by you and Index Exchange; ii) the information provided on our knowledge base linked [here](https://kb.indexexchange.com/publishers/prebid_integration/outstream_video_prebidjs.htm) and [here](https://kb.indexexchange.com/publishers/guidelines/standard_contractual_clauses.htm), and iii) our [Privacy Policy](https://www.indexexchange.com/privacy/). Your use of Index’s outstream video player constitutes your acknowledgement and acceptance of the foregoing. </em>

#### Video Caching

Note that the IX adapter expects a client-side Prebid Cache to be enabled for instream video bidding.

```
pbjs.setConfig({
    usePrebidCache: true,
    cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
    }
});
```

#### User Sync
Add the following code to enable user sync. IX strongly recommends enabling user syncing through iframes. This functionality improves DSP user match rates and increases the IX bid rate and bid price. Be sure to call `pbjs.setConfig()` only once.

```
pbjs.setConfig({
    userSync: {
        iframeEnabled: true,
        filterSettings: {
            iframe: {
                bidders: ['ix'],
                filter: 'include'
            }
        }
    }
});
```
#### The **detectMissingSizes** feature
`detectMissingSize` config is now deprecated and IX bidding adapter bids on all banner sizes available in the ad unit when configured to at least one banner size.

**Native**

```javascript
var adUnits = [{
    code: 'native-div-a',
    mediaTypes: {
        native: {
            title: {
                required: true
            },
            image: {
                required: true
            },
            sponsoredBy: {
                required: false
            }
        }
    },
    bids: [{
        bidder: 'ix',
        params: {
            siteId: '715966'
        }
    }]
}];
```

### 2. Include `ixBidAdapter` in your build process

When running the build command, include `ixBidAdapter` as a module, as well as `dfpAdServerVideo` if you require video support.

```
gulp build --modules=ixBidAdapter,dfpAdServerVideo,fooBidAdapter,bazBidAdapter
```

If a JSON file is being used to specify the bidder modules, add `"ixBidAdapter"`
to the top-level array in that file.

```json
[
    "ixBidAdapter",
    "dfpAdServerVideo",
    "fooBidAdapter",
    "bazBidAdapter"
]
```

And then build.

```
gulp build --modules=bidderModules.json
```

Setting First Party Data (FPD)
==============================

FPD allows you to specify key-value pairs which will be passed as part of the
query string to IX for use in Private Marketplace Deals which rely on query
string targeting for activation. For example, if a user is viewing a
news-related page, you can pass on that information by sending `category=news`.
Then in the IX Private Marketplace setup screens you can create Deals which
activate only on pages which contain `category=news`. Please reach out to your
IX representative if you have any questions or need help setting this up.

To include FPD in a bid request, it must be set before `pbjs.requestBids` is
called. To set it, call `pbjs.setConfig` and provide it with a map of FPD keys
to values as such:

```javascript
pbjs.setConfig({
    ix: {
        firstPartyData: {
            '<key name>': '<key value>',
            '<key name>': '<key value>',
            // ...
        }
    }
});
```

The values can be updated at any time by calling `pbjs.setConfig` again. The
changes will be reflected in any proceeding bid requests.

Setting a Server Side Timeout
=============================

Setting a server-side timeout allows you to control the max length of time taken to connect to the server. The default value when unspecified is 50ms.

This is distinctly different from the global bidder timeout that can be set in
Prebid.js in the browser.

To add a server-side timeout, it must be set before `pbjs.requestBids` is
called. To set it, call `pbjs.setConfig` and provide it with a timeout value as
such:

```javascript
pbjs.setConfig({
    ix: {
        timeout: 500
    }
});
```

The timeout value must be a positive whole number in milliseconds.

Additional Information
======================

### Bid Request Limit

If a single bid request to IX contains more than 20 impression requests (i.e.
more than 20 objects in `bidRequest.imp`), only the first 20 will be accepted,
the rest will be ignored.

To avoid this situation, ensure that when `pbjs.requestBid` is invoked, that the
number of bid objects (i.e. `adUnits[].bids`) with `adUnits[].bids[].bidder` set
to `'ix'` across all ad units that bids are being requested for does not exceed 20.

### Time-To-Live (TTL)

Banner bids from Index have a TTL of 600 seconds while video bids have a TTL of three hours, after which time they become invalid.
**Note:** Index supports the `bid.exp` attribute in the bid response which allows our adapter to specify the maximum number of seconds allowed between the auction and billing notice. In the absence of the `bid.exp` attribute, the TTL provided above applies.

FAQs
====

### Why do I have to input size in `adUnits[].bids[].params` for IX when the size is already in the ad unit?

No, only `siteId` is required.

The `size` parameter is no longer a required field, the `siteId` will now be associated with all the sizes in the ad unit.

### How do I view IX's bid request in the network?

In your browser of choice, create a new tab and open the developer tools. In
developer tools, select the network tab. Then, navigate to a page where IX is
setup to bid. Now, in the network tab, search for requests to
`casalemedia.com/openrtb/pbjs`. These are the bid requests.
