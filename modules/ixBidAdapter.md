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

It is compatible with both the older ad unit format where the `sizes` and
`mediaType` properties are placed at the top-level of the ad unit, and the newer
format where this information is encapsulated within the `mediaTypes` object. We
recommend that you use the newer format when possible as it will be better able
to accommodate new feature additions.

If a mix of properties from both formats are present within an ad unit, the
newer format's properties will take precedence.

Here are examples of both formats.

##### Older Format
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
            playerSize: [
                [300, 250],
                [300, 600]
            ]
        }
    },
    // ...
}];
```

### Supported Media Types

| Type | Support
| --- | ---
| Banner | Fully supported for all IX approved sizes.
| Video  | Fully supported for all IX approved sizes.
| Native | Not supported.

# Bid Parameters

Each of the IX-specific parameters provided under the `adUnits[].bids[].params`
object are detailed here.

### Banner

| Key | Scope | Type | Description
| --- | --- | --- | ---
| siteId | Required | String | An IX-specific identifier that is associated with a specific size on this ad unit. This is similar to a placement ID or an ad unit ID that some other modules have. Examples: `'3723'`, `'6482'`, `'3639'`
| size | Required | Number[] | The single size associated with the site ID. It should be one of the sizes listed in the ad unit under `adUnits[].sizes` or `adUnits[].mediaTypes.banner.sizes`. Examples: `[300, 250]`, `[300, 600]`, `[728, 90]`

### Video

| Key | Scope | Type | Description
| --- | --- | --- | ---
| siteId | Required | String | An IX-specific identifier that is associated with a specific size on this ad unit. This is similar to a placement ID or an ad unit ID that some other modules have. Examples: `'3723'`, `'6482'`, `'3639'`
| size | Required | Number[] | The single size associated with the site ID. It should be one of the sizes listed in the ad unit under `adUnits[].sizes` or `adUnits[].mediaTypes.video.playerSize`. Examples: `[300, 250]`, `[300, 600]`
| video | Required | Hash | The video object will serve as the properties of the video ad. You can create any field under the video object that is mentioned in the `OpenRTB Spec v2.5`. Some fields like `mimes, protocols, minduration, maxduration` are required.
| video.mimes | Required | String[] | Array list of content MIME types supported. Popular MIME types include, but are not limited to, `"video/x-ms- wmv"` for Windows Media and `"video/x-flv"` for Flash Video.
|video.minduration| Required | Integer | Minimum video ad duration in seconds.
|video.maxduration| Required | Integer | Maximum video ad duration in seconds.
|video.protocol / video.protocols| Required | Integer / Integer[] | Either a single protocol provided as an integer, or protocols provided as a list of integers. `2` - VAST 2.0, `3` - VAST 3.0, `5` - VAST 2.0 Wrapper, `6` - VAST 3.0 Wrapper


Setup Guide
===========

Follow these steps to configure and add the IX module to your Prebid.js
integration.

The examples in this guide assume the following starting configuration (you may remove banner or video, if either does not apply).

In regards to video, `context` can either be `'instream'` or `'outstream'`. Note that `outstream` requires additional configuration on the adUnit.

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

For each size in an ad unit that IX will be bidding on, add one of the following
bid objects under `adUnits[].bids`:

```javascript
{
    bidder: 'ix',
    params: {
        siteId: '',
        size: []
    }
}
```

Set `params.siteId` and `params.size` in each bid object to the values provided
by your IX representative.

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
            siteId: '12345',
            size: [300, 250]
        }
    }, {
        bidder: 'ix',
        params: {
            siteId: '12345',
            size: [300, 600]
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
            context: 'instream',
            playerSize: [
                [300, 250],
                [300, 600]
            ]
        }
    },
    bids: [{
        bidder: 'ix',
        params: {
            siteId: '12345',
            size: [300, 250],
            video: {
                mimes: [
                    'video/mp4',
                    'video/webm'
                ],
                minduration: 0,
                maxduration: 60,
                protocols: [6]
            }
        }
    }, {
        bidder: 'ix',
        params: {
            siteId: '12345',
            size: [300, 600],
            video: {
                // openrtb v2.5 compatible video obj
            }
        }
    }]
}];
```
Please note that you can re-use the existing `siteId` within the same flex
position.

**Video (Outstream):**
Note that currently, outstream video rendering must be configured by the publisher. In the adUnit, a `renderer` object must be defined, which includes a `url` pointing to the video rendering script, and a `render` function for creating the video player. See http://prebid.org/dev-docs/show-outstream-video-ads.html for more information.

```javascript
var adUnits = [{
    code: 'video-div-a',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [[300, 250]]
        }
    },
    renderer: {
        url: 'https://test.com/my-video-player.js',
        render: function (bid) {
            ...
        }
    },
    bids: [{
        bidder: 'ix',
        params: {
            siteId: '12345',
            size: [300, 250],
            video: {
                mimes: [
                    'video/mp4',
                    'video/webm'
                ],
                minduration: 0,
                maxduration: 60,
                protocols: [6]
            }
        }
    }]
}];
```

#### Video Caching

Note that the IX adapter expects a client-side Prebid Cache to be enabled for video bidding.

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

Banner bids from IX have a TTL of 300 seconds while video bids have a TTL of 1 hour, after which time they become
invalid.

If an invalid bid wins, and its associated ad is rendered, it will not count
towards total impressions on IX's side.

FAQs
====

### Why do I have to input size in `adUnits[].bids[].params` for IX when the size is already in the ad unit?

There is one important reason why we recommend it:

1. An IX site ID is recommended to map to a single size, whereas an ad unit can have multiple
sizes. To ensure that the right site ID is mapped to the correct size in the ad unit, 
we require the size to be explicitly stated or our bidder will auto assign the site ID to sizes that are not assigned.

### How do I view IX's bid request in the network?

In your browser of choice, create a new tab and open the developer tools. In
developer tools, select the network tab. Then, navigate to a page where IX is
setup to bid. Now, in the network tab, search for requests to
`casalemedia.com/cygnus`. These are the bid requests.
